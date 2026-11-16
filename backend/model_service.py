"""Runs the team's KL-FuseNet (ConvNeXt-Base + ResNet-50 + GeM, no CBAM) inside the backend.
The weights file (best.pt) is stored in a Hugging Face MODEL repo and downloaded once, on the first prediction.
Everything below follows the team's mufsal_model.py: same layers, same preprocessing, same temperature, same grade rule."""
import io, os, threading

import cv2
import numpy as np
import timm
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image

HF_MODEL_REPO = os.environ.get("HF_MODEL_REPO", "Sarahalshalaan/mufsal-knee")
HF_MODEL_FILE = os.environ.get("HF_MODEL_FILE", "best.pt")
TEMPERATURE = float(os.environ.get("MODEL_TEMPERATURE", "0.51"))   # "best T" printed in the notebook (section 16)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class GeM(nn.Module):
    def __init__(self, p=3.0):
        super().__init__()
        self.p = nn.Parameter(torch.tensor([p]))

    def forward(self, x):
        x = x.float().clamp(min=1e-6).pow(self.p)
        return F.avg_pool2d(x, x.shape[-2:]).pow(1 / self.p).flatten(1)


class KLFuseNet(nn.Module):
    def __init__(self):
        super().__init__()
        # pretrained=False: the trained weights come from best.pt, so no ImageNet download is needed
        self.global_net = timm.create_model("convnext_base.fb_in22k_ft_in1k", pretrained=False, num_classes=0, global_pool="")
        self.patch_net = timm.create_model("resnet50.a1_in1k", pretrained=False, num_classes=0, global_pool="")
        self.pool = GeM()
        self.dropout = nn.Dropout(0.1)
        n = self.global_net.num_features + 2 * self.patch_net.num_features
        self.head_ordinal = nn.Linear(n, 4)
        self.head_dist = nn.Linear(n, 5)
        self.head_binary = nn.Linear(n, 1)

    def forward(self, x):
        half = x.shape[-1] // 2
        left, right = x[..., :half], x[..., half:]
        f_global = self.pool(self.global_net.forward_features(x))
        f_both = self.pool(self.patch_net.forward_features(torch.cat([left, right])))
        f_left, f_right = f_both.chunk(2)
        f = F.normalize(self.dropout(torch.cat([f_global, f_left, f_right], dim=1)), dim=1)
        return self.head_ordinal(f), self.head_dist(f), self.head_binary(f).squeeze(1)


EVAL_TF = T.Compose([T.Resize((224, 224)), T.ToTensor(),
                     T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])

_model = None
_lock = threading.Lock()


def _weights_path():
    local = os.environ.get("MODEL_PATH")          # optional: a best.pt already on this computer
    if local:
        return local
    from huggingface_hub import hf_hub_download
    return hf_hub_download(HF_MODEL_REPO, HF_MODEL_FILE, token=os.environ.get("HF_TOKEN") or None)


def get_model():
    global _model
    if _model is None:
        m = KLFuseNet()
        m.load_state_dict(torch.load(_weights_path(), map_location="cpu", weights_only=True))
        _model = m.to(DEVICE).eval()
    return _model


def numbers(ordinal_logits, dist_logits, temperature=TEMPERATURE):
    """Same rules as predict() in mufsal_model.py. The grade comes from the ordinal head; the confidence from the
    temperature-scaled distribution head, read FOR that grade."""
    grade = int((torch.sigmoid(ordinal_logits.float()) > 0.5).sum())
    probs = F.softmax(dist_logits.float() / temperature, dim=1)[0]
    exact = float(probs[grade])
    within1 = float(probs[max(0, grade - 1): grade + 2].sum())
    severe = float(probs[2:].sum())
    return grade, exact, within1, severe, [float(p) for p in probs]


def _gradcam_png(model, x, grade):
    """Grad-CAM on the ResNet stream (layer4), left and right half glued together - as in the notebook."""
    saved = {}

    def grab(module, inputs, output):
        output.retain_grad()
        saved["fmap"] = output

    handle = model.patch_net.layer4.register_forward_hook(grab)
    try:
        model.zero_grad()
        _, dist, _ = model(x)
        dist[0, grade].backward()
    finally:
        handle.remove()
    fmap, grads = saved["fmap"], saved["fmap"].grad
    cam = (grads.mean(dim=(2, 3))[:, :, None, None] * fmap).sum(1).abs()
    both = torch.cat([cam[0], cam[1]], dim=1)
    both = (both / both.max().clamp(min=1e-8)).detach()[None, None].cpu()
    heat = F.interpolate(both, size=(224, 224), mode="bilinear", align_corners=False)[0, 0].numpy()
    heat = cv2.applyColorMap((heat * 255).astype(np.uint8), cv2.COLORMAP_JET)
    return heat


def predict(image_bytes):
    """image_bytes -> dict(grade, confidence, within1, severe, probs[5], gradcam_png bytes)."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    x = EVAL_TF(img)[None].to(DEVICE)
    with _lock:
        model = get_model()
        with torch.no_grad():
            ordinal, dist, _ = model(x)
        grade, exact, within1, severe, probs = numbers(ordinal.cpu(), dist.cpu())
        heat = _gradcam_png(model, x, grade)
    base = cv2.cvtColor(np.array(img.resize((224, 224))), cv2.COLOR_RGB2BGR)
    ok, png = cv2.imencode(".png", cv2.addWeighted(base, 0.6, heat, 0.4, 0))
    return {"grade": grade, "confidence": exact, "within1": within1, "severe": severe,
            "probs": probs, "gradcam_png": png.tobytes()}

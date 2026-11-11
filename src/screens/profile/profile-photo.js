import { state } from "../../app/state.js";
import { isValidPhoto } from "../../model/profile.js";
import { profileElements, saveProfile } from "./profile-screen.js";
import { playAnimation } from "../../ui/animation.js";
import { showToast } from "../../ui/toast.js";

const PHOTO_SIZE = 256;
const PHOTO_QUALITIES = [0.82, 0.7, 0.55];
const MAX_PHOTO_INPUT_BYTES = 20 * 1024 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image could not be decoded"));
    };
    image.src = objectUrl;
  });
}

function cropToSquare(image) {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  canvas.getContext("2d").drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    PHOTO_SIZE,
    PHOTO_SIZE
  );
  return canvas;
}

function encodePhoto(canvas) {
  for (const quality of PHOTO_QUALITIES) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (isValidPhoto(dataUrl)) return dataUrl;
  }
  return null;
}

export function choosePhoto() {
  profileElements.photoInput.value = "";
  profileElements.photoInput.click();
}

export async function handlePhotoFile() {
  const file = profileElements.photoInput.files?.[0];
  if (!file) return;
  if (file.type === "image/svg+xml" || file.size > MAX_PHOTO_INPUT_BYTES) {
    showToast("Wähle ein Foto im Format JPG, PNG oder HEIC bis 20 MB.");
    return;
  }
  let photo = null;
  try {
    photo = encodePhoto(cropToSquare(await loadImage(file)));
  } catch {
    photo = null;
  }
  if (!photo) {
    showToast("Das Foto konnte nicht geladen werden. Versuch ein anderes Bild.");
    return;
  }
  saveProfile({ ...state.profile, photo });
  playAnimation(profileElements.avatar, "bounce");
}

export function removePhoto() {
  saveProfile({ ...state.profile, photo: "" });
}

export const PsychGameConfig = Object.freeze({
  mode: String(import.meta.env.VITE_PSYCHGAME_MODE || "specialist").toLowerCase(),
  dataCollectionEnabled: String(import.meta.env.VITE_DATA_COLLECTION_ENABLED ?? "true").toLowerCase() === "true",
  dataUploadEnabled: String(import.meta.env.VITE_DATA_UPLOAD_ENABLED ?? "true").toLowerCase() === "true"
});

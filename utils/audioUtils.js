export const decodeBase64Audio = async (base64String) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const decodedAudio = atob(base64String);
  const audioBytes = new Uint8Array(decodedAudio.length);
  for (let i = 0; i < decodedAudio.length; i++) {
    audioBytes[i] = decodedAudio.charCodeAt(i);
  }
  return await audioContext.decodeAudioData(audioBytes.buffer);
};

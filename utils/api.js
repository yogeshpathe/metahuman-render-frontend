import { decodeBase64Audio } from './audioUtils';

export const generateAnimationFromPrompt = async (prompt, setIsLoading) => {
  setIsLoading(true);

  try {
    // 1. Fetch the config file
    const configFileRes = await fetch('/config/config_mark.yml');
    const configFileBlob = await configFileRes.blob();
    const configFile = new File([configFileBlob], 'config_mark.yml', { type: 'text/yaml' });

    // 2. Prepare form data
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('config_file', configFile);

    // 3. Call the API
    const response = await fetch('https://a2f3d.cxhope.ai/api/inference-from-prompt', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    if (data.status.code === 'SUCCESS') {
      // 4. Decode base64 audio and create an AudioBuffer
      const audioBuffer = await decodeBase64Audio(data.output_audio_wav_base64);

      // 5. Return animation frames and audio buffer
      return { animationData: data.animation_frames, audioBuffer };
    } else {
      console.error('API returned an error:', data.status.message);
      return { animationData: null, audioBuffer: null };
    }

  } catch (error) {
    console.error('Failed to generate animation:', error);
    return { animationData: null, audioBuffer: null };
  } finally {
    setIsLoading(false);
  }
};

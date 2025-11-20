
class SpeechService {
  private synthesis: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    // Try to load voices immediately, but also listen for the event
    this.loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }
  }

  private loadVoices() {
    const voices = this.synthesis.getVoices();
    // Prefer a robotic or crisp voice (often Google US English or Microsoft Zira/David)
    this.voice = voices.find(v => v.name.includes('Google US English')) || 
                 voices.find(v => v.name.includes('Zira')) || 
                 voices.find(v => v.lang === 'en-US') || 
                 voices[0];
  }

  public speak(text: string) {
    if (!this.synthesis) return;

    // Cancel current speech to avoid queue buildup
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    // Sci-fi adjustments
    utterance.pitch = 0.8; // Slightly lower, more serious
    utterance.rate = 1.0;  // Normal speed
    utterance.volume = 1.0;

    this.synthesis.speak(utterance);
  }
}

export const speechService = new SpeechService();

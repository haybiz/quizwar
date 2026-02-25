import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext;
  private isMuted = false;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
  }

  get muted(): boolean {
    return this.isMuted;
  }

  // Gentle metronome tick for the countdown timer
  playTick(): void {
    if (this.isMuted) return;
    this.playToneAt(800, 'sine', 0.05, 0.05, this.audioContext.currentTime);
  }

  // Ascending major chord for correct answers
  playCorrect(): void {
    if (this.isMuted) return;
    const now = this.audioContext.currentTime;
    this.playToneAt(523.25, 'sine', 0.1, 0.3, now);        // C5
    this.playToneAt(659.25, 'sine', 0.1, 0.3, now + 0.1);  // E5
    this.playToneAt(783.99, 'sine', 0.1, 0.4, now + 0.2);  // G5
  }

  // Descending chromatic buzz for wrong answers
  playWrong(): void {
    if (this.isMuted) return;
    const now = this.audioContext.currentTime;
    this.playToneAt(300, 'sawtooth', 0.08, 0.3, now);
    this.playToneAt(280, 'sawtooth', 0.08, 0.4, now + 0.15);
    this.playToneAt(250, 'sawtooth', 0.08, 0.5, now + 0.3);
  }

  // Triumphant fanfare for game over
  playFanfare(): void {
    if (this.isMuted) return;
    const now = this.audioContext.currentTime;
    this.playToneAt(440, 'triangle', 0.1, 0.2, now);         // A4
    this.playToneAt(440, 'triangle', 0.1, 0.2, now + 0.2);
    this.playToneAt(440, 'triangle', 0.1, 0.2, now + 0.4);
    this.playToneAt(554.37, 'triangle', 0.1, 0.4, now + 0.6); // C#5
    this.playToneAt(659.25, 'triangle', 0.1, 0.4, now + 0.8); // E5
    this.playToneAt(880, 'triangle', 0.1, 0.8, now + 1.0);    // A5
  }

  // Final low drone for timeout/zero points
  playTimeout(): void {
    if (this.isMuted) return;
    this.playToneAt(150, 'square', 0.05, 0.8, this.audioContext.currentTime);
    this.playToneAt(140, 'sawtooth', 0.05, 0.8, this.audioContext.currentTime);
  }

  private playToneAt(freq: number, type: OscillatorType, maxVol: number, dur: number, startTime: number): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Envelope to prevent popping
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(maxVol, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start(startTime);
      osc.stop(startTime + dur);
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  }
}

import type { CharacterId } from '@/game/characters';

type MusicProfile = {
  bpm: number;
  root: number;
  scale: readonly number[];
  motif: readonly number[];
  lead: OscillatorType;
  bass: OscillatorType;
  percussion: number;
  atmosphere: number;
};

const STAGE_MUSIC_PROFILES: readonly MusicProfile[] = [
  { bpm: 82, root: 50, scale: [0, 2, 3, 7, 9], motif: [0, 2, 4, 2, 1, 3, 2, 0], lead: 'triangle', bass: 'sine', percussion: 0.26, atmosphere: 0.42 },
  { bpm: 76, root: 47, scale: [0, 1, 3, 7, 8], motif: [0, 3, 1, 4, 2, 1, 3, 0], lead: 'sine', bass: 'triangle', percussion: 0.18, atmosphere: 0.65 },
  { bpm: 88, root: 45, scale: [0, 2, 5, 7, 10], motif: [0, 1, 3, 2, 4, 2, 1, 3], lead: 'square', bass: 'triangle', percussion: 0.4, atmosphere: 0.25 },
  { bpm: 116, root: 43, scale: [0, 3, 5, 7, 10], motif: [0, 4, 3, 1, 2, 4, 3, 2], lead: 'sawtooth', bass: 'square', percussion: 0.72, atmosphere: 0.18 },
  { bpm: 72, root: 52, scale: [0, 2, 3, 7, 10], motif: [4, 2, 3, 1, 0, 2, 1, 3], lead: 'sine', bass: 'sine', percussion: 0.14, atmosphere: 0.58 },
  { bpm: 92, root: 49, scale: [0, 1, 5, 7, 8], motif: [0, 1, 4, 3, 1, 2, 4, 2], lead: 'triangle', bass: 'square', percussion: 0.46, atmosphere: 0.3 },
  { bpm: 104, root: 55, scale: [0, 2, 4, 7, 9], motif: [0, 2, 4, 3, 4, 2, 1, 3], lead: 'sine', bass: 'triangle', percussion: 0.34, atmosphere: 0.5 },
  { bpm: 94, root: 44, scale: [0, 1, 3, 6, 8], motif: [0, 3, 4, 1, 3, 2, 4, 0], lead: 'sawtooth', bass: 'sine', percussion: 0.48, atmosphere: 0.44 },
  { bpm: 78, root: 46, scale: [0, 2, 5, 7, 9], motif: [0, 4, 2, 3, 1, 4, 3, 2], lead: 'sine', bass: 'triangle', percussion: 0.2, atmosphere: 0.72 },
  { bpm: 124, root: 48, scale: [0, 3, 5, 6, 10], motif: [0, 3, 1, 4, 2, 4, 1, 3], lead: 'square', bass: 'sawtooth', percussion: 0.82, atmosphere: 0.2 },
  { bpm: 84, root: 42, scale: [0, 1, 3, 7, 9], motif: [0, 1, 3, 4, 2, 1, 4, 3], lead: 'triangle', bass: 'sine', percussion: 0.28, atmosphere: 0.7 },
  { bpm: 98, root: 51, scale: [0, 2, 4, 6, 9], motif: [0, 4, 3, 1, 4, 2, 3, 1], lead: 'sine', bass: 'triangle', percussion: 0.32, atmosphere: 0.56 },
  { bpm: 110, root: 45, scale: [0, 2, 5, 7, 10], motif: [0, 3, 2, 4, 1, 3, 4, 2], lead: 'square', bass: 'sawtooth', percussion: 0.68, atmosphere: 0.24 },
  { bpm: 90, root: 48, scale: [0, 1, 5, 7, 10], motif: [0, 1, 4, 2, 3, 1, 2, 4], lead: 'triangle', bass: 'square', percussion: 0.44, atmosphere: 0.38 },
  { bpm: 86, root: 57, scale: [0, 2, 4, 7, 11], motif: [0, 2, 4, 3, 1, 4, 2, 3], lead: 'sine', bass: 'sine', percussion: 0.24, atmosphere: 0.62 },
  { bpm: 80, root: 41, scale: [0, 1, 4, 6, 8], motif: [0, 4, 1, 3, 2, 4, 3, 1], lead: 'sawtooth', bass: 'sine', percussion: 0.3, atmosphere: 0.82 },
  { bpm: 96, root: 50, scale: [0, 2, 3, 7, 8], motif: [0, 3, 1, 2, 4, 2, 3, 1], lead: 'triangle', bass: 'sine', percussion: 0.52, atmosphere: 0.54 },
  { bpm: 128, root: 43, scale: [0, 3, 5, 7, 11], motif: [0, 4, 3, 2, 4, 1, 3, 2], lead: 'sawtooth', bass: 'square', percussion: 0.88, atmosphere: 0.25 },
  { bpm: 74, root: 40, scale: [0, 1, 5, 6, 10], motif: [0, 2, 4, 1, 3, 4, 2, 1], lead: 'sine', bass: 'triangle', percussion: 0.22, atmosphere: 0.88 },
  { bpm: 118, root: 46, scale: [0, 2, 3, 6, 10], motif: [0, 4, 2, 3, 4, 1, 3, 2], lead: 'square', bass: 'sawtooth', percussion: 0.9, atmosphere: 0.6 },
];

function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function skillVariation(skillId: string): number {
  return [...skillId].reduce((total, character) => total + character.charCodeAt(0), 0) % 5;
}

export class QuestAudioDirector {
  private static readonly MASTER_VOLUME = 0.9;
  private static readonly MUSIC_VOLUME = 0.58;
  private static readonly BOSS_MUSIC_VOLUME = 0.72;
  private static readonly SFX_VOLUME = 0.88;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private schedulerId: number | null = null;
  private nextStepAt = 0;
  private step = 0;
  private enabled = true;
  private bossIntensity = false;
  private stopped = false;

  constructor(private readonly stageNumber: number) {}

  setEnabled(enabled: boolean): void {
    if (this.stopped) return;
    this.enabled = enabled;
    if (!enabled) {
      this.masterGain?.gain.setTargetAtTime(0, this.context?.currentTime ?? 0, 0.04);
      return;
    }
    void this.unlock();
    if (this.context && this.masterGain) this.masterGain.gain.setTargetAtTime(QuestAudioDirector.MASTER_VOLUME, this.context.currentTime, 0.06);
  }

  async unlock(): Promise<void> {
    if (!this.enabled || this.stopped) return;
    if (!this.context) this.createGraph();
    if (!this.context) return;
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        return;
      }
    }
    if (this.schedulerId === null) this.startScheduler();
  }

  setBossIntensity(enabled: boolean): void {
    if (this.stopped) return;
    this.bossIntensity = enabled;
    if (!this.context || !this.musicGain) return;
    this.musicGain.gain.setTargetAtTime(enabled ? QuestAudioDirector.BOSS_MUSIC_VOLUME : QuestAudioDirector.MUSIC_VOLUME, this.context.currentTime, 0.3);
  }

  playSkill(characterId: CharacterId, skillId: string): void {
    if (!this.enabled || this.stopped || !this.context || !this.sfxGain || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const variation = skillVariation(skillId);
    if (characterId === 'warrior') {
      this.sweep(now, 240 + variation * 24, 78, 0.28, 'sawtooth', 0.22);
      this.noiseBurst(now + 0.035, 0.12, 1_500, 0.12);
      return;
    }
    if (characterId === 'mage') {
      [0, 4, 7].forEach((offset, index) => this.pulseTone(now + index * 0.055, midiToFrequency(67 + variation + offset), 0.24, 'sine', 0.15));
      return;
    }
    if (characterId === 'spellblade') {
      this.sweep(now, 150 + variation * 18, 520, 0.32, 'sawtooth', 0.14);
      this.pulseTone(now + 0.05, midiToFrequency(48 + variation), 0.34, 'triangle', 0.16);
      return;
    }
    if (characterId === 'archer') {
      this.sweep(now, 760 + variation * 35, 260, 0.19, 'triangle', 0.15);
      this.noiseBurst(now, 0.08, 3_200, 0.08);
      return;
    }
    if (characterId === 'conservative') {
      [0, 7, 12].forEach((offset) => this.pulseTone(now, midiToFrequency(43 + variation + offset), 0.34, 'square', 0.09));
      this.noiseBurst(now + 0.08, 0.14, 900, 0.08);
      return;
    }
    [0, 4, 9].forEach((offset, index) => this.pulseTone(now + index * 0.045, midiToFrequency(61 + variation + offset), 0.3, 'sine', 0.12));
    this.sweep(now + 0.04, 420, 960, 0.26, 'triangle', 0.08);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.enabled = false;
    if (this.schedulerId !== null) window.clearInterval(this.schedulerId);
    this.schedulerId = null;
    const context = this.context;
    if (!context) return;
    this.masterGain?.gain.setTargetAtTime(0, context.currentTime, 0.03);
    window.setTimeout(() => void context.close(), 120);
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
  }

  private createGraph(): void {
    const context = new AudioContext();
    const master = context.createGain();
    const music = context.createGain();
    const sfx = context.createGain();
    master.gain.value = QuestAudioDirector.MASTER_VOLUME;
    music.gain.value = this.bossIntensity ? QuestAudioDirector.BOSS_MUSIC_VOLUME : QuestAudioDirector.MUSIC_VOLUME;
    sfx.gain.value = QuestAudioDirector.SFX_VOLUME;
    music.connect(master);
    sfx.connect(master);
    master.connect(context.destination);
    this.context = context;
    this.masterGain = master;
    this.musicGain = music;
    this.sfxGain = sfx;
  }

  private startScheduler(): void {
    if (!this.context) return;
    this.nextStepAt = this.context.currentTime + 0.05;
    this.schedulerId = window.setInterval(() => this.scheduleAhead(), 80);
    this.scheduleAhead();
  }

  private scheduleAhead(): void {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const profile = STAGE_MUSIC_PROFILES[this.stageNumber - 1] ?? STAGE_MUSIC_PROFILES[0]!;
    const stepDuration = 30 / (profile.bpm * (this.bossIntensity ? 1.12 : 1));
    while (this.nextStepAt < context.currentTime + 0.45) {
      this.scheduleMusicStep(profile, this.step, this.nextStepAt, stepDuration);
      this.nextStepAt += stepDuration;
      this.step = (this.step + 1) % 16;
    }
  }

  private scheduleMusicStep(profile: MusicProfile, step: number, start: number, duration: number): void {
    if (!this.musicGain) return;
    const scaleIndex = profile.motif[step % profile.motif.length] ?? 0;
    const leadNote = profile.root + 12 + (profile.scale[scaleIndex] ?? 0);
    if (step % 2 === 0) this.musicTone(start, midiToFrequency(leadNote), duration * 1.5, profile.lead, 0.2);
    if (step % 4 === 0) {
      const bassIndex = profile.motif[(step / 2) % profile.motif.length] ?? 0;
      this.musicTone(start, midiToFrequency(profile.root - 12 + (profile.scale[bassIndex] ?? 0)), duration * 3.4, profile.bass, 0.25);
      this.noiseBurst(start, 0.07, step % 8 === 0 ? 190 : 620, profile.percussion * 0.055, this.musicGain);
    }
    if (step % 8 === 0) {
      [0, 2, 4].forEach((index) => this.musicTone(start, midiToFrequency(profile.root + (profile.scale[index] ?? 0)), duration * 7.4, 'sine', 0.055));
      this.noiseBurst(start, duration * 5, 360 + this.stageNumber * 24, profile.atmosphere * 0.012, this.musicGain);
    }
  }

  private musicTone(start: number, frequency: number, duration: number, wave: OscillatorType, volume: number): void {
    if (!this.musicGain) return;
    this.tone(start, frequency, duration, wave, volume, this.musicGain);
  }

  private pulseTone(start: number, frequency: number, duration: number, wave: OscillatorType, volume: number): void {
    if (!this.sfxGain) return;
    this.tone(start, frequency, duration, wave, volume, this.sfxGain);
  }

  private tone(start: number, frequency: number, duration: number, wave: OscillatorType, volume: number, destination: AudioNode): void {
    const context = this.context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private sweep(start: number, from: number, to: number, duration: number, wave: OscillatorType, volume: number): void {
    const context = this.context;
    if (!context || !this.sfxGain) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  private noiseBurst(start: number, duration: number, cutoff: number, volume: number, destination = this.sfxGain): void {
    const context = this.context;
    if (!context || !destination) return;
    const sampleCount = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start);
  }
}

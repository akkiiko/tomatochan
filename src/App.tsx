import { useCallback, useEffect, useRef, useState } from 'react';

type Phase = 'focus' | 'break';

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const TOTAL_ROUNDS = 4;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [round, setRound] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    const audio = audioContextRef.current;
    if (!audio) return;

    // 2音のやさしいチャイム
    [880, 1174].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const startAt = audio.currentTime + index * 0.18;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.55);

      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.58);
    });

    if ('vibrate' in navigator) navigator.vibrate?.([160, 80, 160]);
  }, []);

  const prepareAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext;
      if (AudioContextClass) audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current?.state === 'suspended') {
      void audioContextRef.current.resume();
    }
  }, []);

  const toggleTimer = () => {
    if (isComplete) {
      setPhase('focus');
      setSecondsLeft(FOCUS_SECONDS);
      setRound(1);
      setIsComplete(false);
      setIsRunning(true);
      prepareAudio();
      return;
    }
    if (!isRunning) prepareAudio();
    setIsRunning((current) => !current);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPhase('focus');
    setSecondsLeft(FOCUS_SECONDS);
    setRound(1);
    setIsComplete(false);
  };

  // カウントダウン
  useEffect(() => {
    if (!isRunning) return;
    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [isRunning]);

  // 0秒になったらチャイムを鳴らし、次のフェーズへ
  useEffect(() => {
    if (!isRunning || secondsLeft !== 0) return;

    playChime();

    if (phase === 'focus') {
      setPhase('break');
      setSecondsLeft(BREAK_SECONDS);
      return;
    }

    if (round < TOTAL_ROUNDS) {
      setRound((current) => current + 1);
      setPhase('focus');
      setSecondsLeft(FOCUS_SECONDS);
      return;
    }

    // 4回目の休憩が終わったら完了
    setIsRunning(false);
    setIsComplete(true);
    setPhase('focus');
    setSecondsLeft(FOCUS_SECONDS);
  }, [isRunning, secondsLeft, phase, round, playChime]);

  const progress = phase === 'focus'
    ? (FOCUS_SECONDS - secondsLeft) / FOCUS_SECONDS
    : (BREAK_SECONDS - secondsLeft) / BREAK_SECONDS;

  const statusText = isComplete
    ? 'おつかれさまでした！'
    : phase === 'focus'
      ? '集中タイム'
      : 'ほっとひと休み';

  const buttonText = isComplete
    ? 'もう一度はじめる'
    : isRunning
      ? 'タップして一時停止'
      : secondsLeft === (phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS)
        ? 'タップしてスタート'
        : 'タップして再開';

  return (
    <main className={`app-shell ${phase === 'break' && !isComplete ? 'is-break' : ''}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="timer-card" aria-label="ポモドーロタイマー">
        <div className="top-label">
          <span className="tiny-tomato" aria-hidden="true">🍅</span>
          <span>TOMATO TIME</span>
        </div>

        <h1>トマトのポモドーロ</h1>
        <p className="subtitle">25分集中 ＋ 5分休憩を、4回くり返そう。</p>

        <div className="phase-pill">
          <span className="phase-dot" />
          {statusText}
        </div>

        <button
          className={`tomato-button ${isRunning ? 'is-running' : ''}`}
          onClick={toggleTimer}
          aria-label={buttonText}
          type="button"
        >
          <span className="tomato-leaf leaf-one" />
          <span className="tomato-leaf leaf-two" />
          <span className="tomato-leaf leaf-three" />
          <span className="tomato-shine" />
          <span className="timer-display">{isComplete ? 'DONE!' : formatTime(secondsLeft)}</span>
          <span className="button-symbol" aria-hidden="true">
            {isRunning ? 'Ⅱ' : '▶'}
          </span>
        </button>

        <p className="tap-hint">{buttonText}</p>

        <div className="rounds" aria-label={`全4回中${round}回目`}>
          <div className="round-icons">
            {Array.from({ length: TOTAL_ROUNDS }, (_, index) => (
              <span
                className={`round-tomato ${index < round ? 'is-active' : ''} ${isComplete ? 'is-active' : ''}`}
                key={index}
                aria-label={`${index + 1}回目`}
              >🍅</span>
            ))}
          </div>
          <span className="round-count">{isComplete ? '4 / 4 完了' : `${round} / 4`}</span>
        </div>

        <div className="progress-track" aria-label="現在の時間の進み具合">
          <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }} />
        </div>

        <div className="bottom-row">
          <span>{phase === 'focus' ? 'FOCUS  25:00' : 'BREAK  05:00'}</span>
          <button className="reset-button" type="button" onClick={resetTimer}>最初から ↺</button>
        </div>
      </section>

      <p className="footer-note">ひとつずつ、できることから。</p>
    </main>
  );
}
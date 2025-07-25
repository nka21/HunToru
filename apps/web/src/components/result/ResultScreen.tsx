import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import clsx from 'clsx';
import { motion } from 'framer-motion';

import huntoru from '../../assets/huntoru.png';
import styles from './ResultScreen.module.css';

export const ResultScreen = () => {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const scoreValueRef = useRef<HTMLSpanElement>(null);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);

  const navigate = useNavigate();
  const handleReplay = useCallback(() => {
    navigate('/mode');
  }, [navigate]);

  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const animateScore = (
    element: HTMLElement,
    start: number,
    end: number,
    duration: number,
  ) => {
    const startTime = performance.now();

    const updateScore = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = start + (end - start) * easeProgress;

      // DOM更新のみ
      element.textContent = currentValue.toFixed(2);

      if (progress < 1) {
        requestAnimationFrame(updateScore);
      } else {
        element.textContent = end.toFixed(2);
      }
    };

    requestAnimationFrame(updateScore);
  };
  useEffect(() => {
    const progressBar = progressBarRef.current;
    const scoreValue = scoreValueRef.current;

    if (!progressBar || !scoreValue) return;

    const animateResult = () => {
      progressBar.style.width = '0%';
      setProgress(0);
      setScore(0);

      return setTimeout(() => {
        progressBar.style.width = '85%';
        setProgress(85);
        animateScore(scoreValue, 0, 0.85, 1500);
      }, 500);
    };

    const timeoutId = animateResult();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const progressBar = progressBarRef.current;
    const scoreValue = scoreValueRef.current;

    if (!progressBar || !scoreValue) return;

    const animateResult = () => {
      progressBar.style.width = '0%';
      setProgress(0);
      setScore(0);

      return setTimeout(() => {
        progressBar.style.width = '85%';
        setProgress(85);
        animateScore(scoreValue, 0, 0.85, 1500);
      }, 500);
    };

    const timeoutId = animateResult();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <motion.div
      className={clsx(styles.screen, styles['result-screen'])}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className={styles.content}>
        <div className={styles['result-content']}>
          {/* 上部の情報 */}
          <div className={styles['result-top-info']}>
            <div className={styles['result-emoji']}>🎉</div>
            <h1 className={styles['result-title']}>成功！</h1>

            {/* プログレスバースコア表示 */}
            <div className={styles['score-progress-container']}>
              <div className={styles['score-header']}>
                <div className={styles['score-label-progress']}>おいしさ度</div>
                <span
                  className={styles['score-value-progress']}
                  ref={scoreValueRef}
                >
                  {score}
                </span>
              </div>
              <div className={styles['progress-bar-container']}>
                <div
                  className={styles['progress-bar-fill']}
                  style={{ width: `${progress}%` }}
                  ref={progressBarRef}
                />
              </div>
            </div>
          </div>

          {/* キャラクター */}
          <div className={styles['character-center']}>
            <div className={styles['character-main']}>
              <img
                src={huntoru}
                alt="huntoru"
                className={styles['character-image']}
              />
            </div>
          </div>

          {/* ボタン */}
          <div className={styles['action-buttons-result']}>
            <button
              type="button"
              className={clsx(
                styles['action-button-result'],
                styles['btn-primary-result'],
              )}
              onClick={handleReplay}
            >
              もう一度とる！
            </button>
            <button
              type="button"
              className={clsx(
                styles['action-button-result'],
                styles['btn-secondary-result'],
              )}
              onClick={handleHome}
            >
              ホームへ
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

import styles from "./loading.module.css";

export default function InvitationLoading() {
  return (
    <div className={styles.ldr}>
      <div className={styles.ldrOrnament}>
        <svg viewBox="0 0 120 120" width="140" height="140" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer decorative ring */}
          <circle
            cx="60" cy="60" r="54"
            stroke="#7f9b7e"
            strokeWidth="0.7"
            pathLength="1"
            className={styles.ldrRing}
          />

          {/* North petal */}
          <path
            d="M60,60 C50,50 48,32 60,22 C72,32 70,50 60,60Z"
            stroke="#7f9b7e"
            strokeWidth="1.2"
            fill="rgba(127,155,126,0.08)"
            pathLength="1"
            className={styles.ldrPetalN}
          />

          {/* East petal */}
          <path
            d="M60,60 C70,50 88,48 98,60 C88,72 70,70 60,60Z"
            stroke="#7f9b7e"
            strokeWidth="1.2"
            fill="rgba(127,155,126,0.08)"
            pathLength="1"
            className={styles.ldrPetalE}
          />

          {/* South petal */}
          <path
            d="M60,60 C70,70 72,88 60,98 C48,88 50,70 60,60Z"
            stroke="#7f9b7e"
            strokeWidth="1.2"
            fill="rgba(127,155,126,0.08)"
            pathLength="1"
            className={styles.ldrPetalS}
          />

          {/* West petal */}
          <path
            d="M60,60 C50,70 32,72 22,60 C32,48 50,50 60,60Z"
            stroke="#7f9b7e"
            strokeWidth="1.2"
            fill="rgba(127,155,126,0.08)"
            pathLength="1"
            className={styles.ldrPetalW}
          />

          {/* Inner ring */}
          <circle
            cx="60" cy="60" r="14"
            stroke="#7f9b7e"
            strokeWidth="0.6"
            strokeDasharray="2.4 3.2"
            pathLength="1"
            className={styles.ldrInnerRing}
          />

          {/* Petal tip accent dots */}
          <g className={styles.ldrTips}>
            <circle cx="60"   cy="21.5" r="2"   fill="#7f9b7e" opacity="0.65" />
            <circle cx="98.5" cy="60"   r="2"   fill="#7f9b7e" opacity="0.65" />
            <circle cx="60"   cy="98.5" r="2"   fill="#7f9b7e" opacity="0.65" />
            <circle cx="21.5" cy="60"   r="2"   fill="#7f9b7e" opacity="0.65" />
          </g>

          {/* Center core */}
          <circle
            cx="60" cy="60" r="5.5"
            stroke="#7f9b7e"
            strokeWidth="1"
            fill="rgba(127,155,126,0.22)"
            className={styles.ldrCore}
          />
        </svg>
      </div>

      <p className={styles.ldrText}>Preparing your invitation</p>

      <div className={styles.ldrDots}>
        <span className={styles.ldrDot} />
        <span className={styles.ldrDot} />
        <span className={styles.ldrDot} />
      </div>
    </div>
  );
}

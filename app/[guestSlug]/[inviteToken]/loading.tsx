export default function InvitationLoading() {
  return (
    <>
      <style>{`
        .ldr {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 0%, rgba(169, 195, 167, 0.22), transparent 40%),
            linear-gradient(180deg, #f8f6ef 0%, #f5f4ec 100%);
          gap: 1.6rem;
          z-index: 9999;
        }

        .ldr-ornament {
          width: 140px;
          height: 140px;
        }

        .ldr-ornament svg {
          overflow: visible;
        }

        .ldr-ring {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: ldr-draw 1.4s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
        }

        .ldr-petal-n {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: ldr-draw 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.55s forwards;
        }
        .ldr-petal-e {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: ldr-draw 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.75s forwards;
        }
        .ldr-petal-s {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: ldr-draw 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.95s forwards;
        }
        .ldr-petal-w {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: ldr-draw 0.8s cubic-bezier(0.4, 0, 0.2, 1) 1.15s forwards;
        }

        .ldr-inner-ring {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: ldr-draw 0.9s cubic-bezier(0.4, 0, 0.2, 1) 1.3s forwards;
        }

        .ldr-tips {
          opacity: 0;
          animation: ldr-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 1.45s forwards;
        }

        .ldr-core {
          opacity: 0;
          animation: ldr-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 1.6s forwards;
        }

        .ldr-text {
          font-family: var(--font-cormorant), Georgia, serif;
          font-style: italic;
          font-weight: 400;
          font-size: 1.0rem;
          color: #5a7259;
          letter-spacing: 0.14em;
          opacity: 0;
          animation: ldr-rise 0.8s ease 1.9s forwards;
        }

        .ldr-dots {
          display: flex;
          gap: 7px;
          align-items: center;
          opacity: 0;
          animation: ldr-fade 0.5s ease 2.2s forwards;
        }

        .ldr-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #7f9b7e;
          animation: ldr-pulse 1.5s ease-in-out 2.6s infinite;
        }
        .ldr-dot:nth-child(2) { animation-delay: 2.85s; }
        .ldr-dot:nth-child(3) { animation-delay: 3.1s; }

        @keyframes ldr-draw {
          from { stroke-dashoffset: 1; }
          to   { stroke-dashoffset: 0; }
        }

        @keyframes ldr-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes ldr-rise {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes ldr-pop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }

        @keyframes ldr-pulse {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50%      { opacity: 1;    transform: translateY(-3px); }
        }
      `}</style>

      <div className="ldr">
        <div className="ldr-ornament">
          <svg viewBox="0 0 120 120" width="140" height="140" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer decorative ring */}
            <circle
              cx="60" cy="60" r="54"
              stroke="#7f9b7e"
              strokeWidth="0.7"
              pathLength="1"
              className="ldr-ring"
            />

            {/* North petal */}
            <path
              d="M60,60 C50,50 48,32 60,22 C72,32 70,50 60,60Z"
              stroke="#7f9b7e"
              strokeWidth="1.2"
              fill="rgba(127,155,126,0.08)"
              pathLength="1"
              className="ldr-petal-n"
            />

            {/* East petal */}
            <path
              d="M60,60 C70,50 88,48 98,60 C88,72 70,70 60,60Z"
              stroke="#7f9b7e"
              strokeWidth="1.2"
              fill="rgba(127,155,126,0.08)"
              pathLength="1"
              className="ldr-petal-e"
            />

            {/* South petal */}
            <path
              d="M60,60 C70,70 72,88 60,98 C48,88 50,70 60,60Z"
              stroke="#7f9b7e"
              strokeWidth="1.2"
              fill="rgba(127,155,126,0.08)"
              pathLength="1"
              className="ldr-petal-s"
            />

            {/* West petal */}
            <path
              d="M60,60 C50,70 32,72 22,60 C32,48 50,50 60,60Z"
              stroke="#7f9b7e"
              strokeWidth="1.2"
              fill="rgba(127,155,126,0.08)"
              pathLength="1"
              className="ldr-petal-w"
            />

            {/* Inner ring */}
            <circle
              cx="60" cy="60" r="14"
              stroke="#7f9b7e"
              strokeWidth="0.6"
              strokeDasharray="2.4 3.2"
              pathLength="1"
              className="ldr-inner-ring"
            />

            {/* Petal tip accent dots */}
            <g className="ldr-tips">
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
              className="ldr-core"
            />
          </svg>
        </div>

        <p className="ldr-text">Preparing your invitation</p>

        <div className="ldr-dots">
          <span className="ldr-dot" />
          <span className="ldr-dot" />
          <span className="ldr-dot" />
        </div>
      </div>
    </>
  );
}

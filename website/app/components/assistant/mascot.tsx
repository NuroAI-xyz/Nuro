/** The centered assistant mascot — the Nuro mark inside a soft liquid-glass
 * glow, echoing the reference composition but on-brand. */
export function AssistantMascot({ size = 116 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      {/* ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(126,214,255,0.55) 0%, rgba(126,214,255,0.12) 45%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      {/* glass orb */}
      <div
        className="relative grid place-items-center rounded-full border border-white/[0.14]"
        style={{
          width: size * 0.82,
          height: size * 0.82,
          background:
            "linear-gradient(155deg, rgba(255,255,255,0.14) 0%, rgba(126,214,255,0.06) 55%, rgba(255,255,255,0.02) 100%)",
          boxShadow:
            "inset 0 2px 10px rgba(255,255,255,0.18), 0 12px 40px rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
        }}
      >
        <img
          src="/black_background-removebg-preview.png"
          alt="Nuro"
          className="object-contain"
          style={{ width: size * 0.5, height: size * 0.5 }}
        />
      </div>
    </div>
  );
}

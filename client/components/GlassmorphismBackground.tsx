import { useTheme } from "@/contexts/ThemeContext";

export default function GlassmorphismBackground() {
  const { currentTheme } = useTheme();

  if (currentTheme !== "glassmorphism-liquid") {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[-10] overflow-hidden pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        style={{
          filter: "blur(1px)",
        }}
      >
        <source
          src="https://cdn.builder.io/o/assets%2Fc2e2036daac94e30a2750cdc98393ad5%2F36e22a59d6a4488394b7f9a9f9c23fad?alt=media&token=ec792d4a-0248-41bd-afa9-075ffda8a77f&apiKey=c2e2036daac94e30a2750cdc98393ad5"
          type="video/mp4"
        />
      </video>
    </div>
  );
}

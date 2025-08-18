import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AdvancedCaptchaProps {
  onCaptchaChange: (value: string) => void;
  onValidationChange: (isValid: boolean) => void;
}

export default function AdvancedCaptcha({
  onCaptchaChange,
  onValidationChange,
}: AdvancedCaptchaProps) {
  const [captchaCode, setCaptchaCode] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isValid, setIsValid] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptchaCode = () => {
    // Generate a 6-character code with mixed letters and numbers
    const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789"; // Excluding O and 0 for clarity
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setUserAnswer("");
    setIsValid(false);
    onValidationChange(false);
    drawCaptcha(code);
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create gradient background
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    gradient.addColorStop(0, "#f8fafc");
    gradient.addColorStop(0.5, "#e2e8f0");
    gradient.addColorStop(1, "#cbd5e1");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise lines with different colors
    const lineColors = ["#94a3b8", "#64748b", "#475569"];
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle =
        lineColors[Math.floor(Math.random() * lineColors.length)];
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw each character with different styling
    const charWidth = canvas.width / text.length;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const x = charWidth * i + charWidth / 2;
      const y = canvas.height / 2;

      ctx.save();

      // Random font size and style
      const fontSize = 20 + Math.random() * 8;
      const fontFamily = Math.random() > 0.5 ? "Arial" : "Georgia";
      ctx.font = `bold ${fontSize}px ${fontFamily}`;

      // Random colors
      const colors = ["#1e293b", "#334155", "#475569", "#0f172a"];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];

      // Random rotation
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.4);

      // Random position offset
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetY = (Math.random() - 0.5) * 10;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(char, offsetX, offsetY);

      // Add shadow/outline
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 0.5;
      ctx.strokeText(char, offsetX, offsetY);

      ctx.restore();
    }

    // Add noise dots
    ctx.fillStyle = "#94a3b8";
    for (let i = 0; i < 100; i++) {
      const size = Math.random() * 2;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        size,
        size,
      );
    }

    // Add interference patterns
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const amplitude = 10;
      const frequency = 0.02;
      for (let x = 0; x < canvas.width; x++) {
        const y =
          canvas.height / 2 + Math.sin(x * frequency + i * 2) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  };

  const handleAnswerChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setUserAnswer(upperValue);
    const valid = upperValue === captchaCode;
    console.log("[CAPTCHA DEBUG]", {
      userInput: value,
      upperValue,
      captchaCode,
      valid,
      match: upperValue === captchaCode,
    });
    setIsValid(valid);
    onValidationChange(valid);
    onCaptchaChange(upperValue);
  };

  const refreshCaptcha = () => {
    generateCaptchaCode();
  };

  useEffect(() => {
    generateCaptchaCode();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-white shadow-sm">
            <canvas
              ref={canvasRef}
              width={200}
              height={60}
              className="mx-auto block"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refreshCaptcha}
          className="flex-shrink-0 border-gray-300 hover:bg-gray-50"
          title="Gerar novo código"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mr-1"
          >
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
          </svg>
          Novo
        </Button>
      </div>
      <div>
        <Input
          id="captcha-input"
          type="text"
          placeholder="Digite o código mostrado acima"
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className="border-gray-300 focus:border-gray-500 focus:ring-gray-500 h-9"
          maxLength={6}
        />
      </div>
    </div>
  );
}

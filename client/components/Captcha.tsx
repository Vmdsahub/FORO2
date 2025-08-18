import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CaptchaProps {
  onCaptchaChange: (value: string) => void;
  onValidationChange: (isValid: boolean) => void;
}

export default function Captcha({
  onCaptchaChange,
  onValidationChange,
}: CaptchaProps) {
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState<number>(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isValid, setIsValid] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateMathCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operation = Math.random() > 0.5 ? "+" : "-";

    let question: string;
    let answer: number;

    if (operation === "+") {
      question = `${num1} + ${num2}`;
      answer = num1 + num2;
    } else {
      // Ensure we don't get negative results
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      question = `${larger} - ${smaller}`;
      answer = larger - smaller;
    }

    setCaptchaQuestion(question);
    setCaptchaAnswer(answer);
    setUserAnswer("");
    setIsValid(false);
    onValidationChange(false);
    drawCaptcha(question);
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise lines
    ctx.strokeStyle = "#e9ecef";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw text
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#343a40";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add slight rotation and position variation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((Math.random() - 0.5) * 0.2); // Small rotation
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Add some noise dots
    ctx.fillStyle = "#adb5bd";
    for (let i = 0; i < 50; i++) {
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        1,
        1,
      );
    }
  };

  const handleAnswerChange = (value: string) => {
    setUserAnswer(value);
    const numericValue = parseInt(value, 10);
    const valid = !isNaN(numericValue) && numericValue === captchaAnswer;
    setIsValid(valid);
    onValidationChange(valid);
    onCaptchaChange(value);
  };

  const refreshCaptcha = () => {
    generateMathCaptcha();
  };

  useEffect(() => {
    generateMathCaptcha();
  }, []);

  return (
    <div className="space-y-3">
      <Label className="text-black/80">Verificação de Segurança</Label>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <canvas
              ref={canvasRef}
              width={150}
              height={50}
              className="mx-auto block"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refreshCaptcha}
          className="flex-shrink-0"
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
          Atualizar
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="captcha-input" className="text-sm text-gray-600">
          Qual o resultado de:{" "}
          <span className="font-semibold">{captchaQuestion} = ?</span>
        </Label>
        <Input
          id="captcha-input"
          type="number"
          placeholder="Digite o resultado"
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className={`border-black/20 focus:border-black/40 ${
            userAnswer && (isValid ? "border-green-500" : "border-red-500")
          }`}
        />
        {userAnswer && (
          <p
            className={`text-xs ${isValid ? "text-green-600" : "text-red-600"}`}
          >
            {isValid ? "✓ Verificação válida" : "✗ Resposta incorreta"}
          </p>
        )}
      </div>
    </div>
  );
}

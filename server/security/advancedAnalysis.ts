import sharp from "sharp";
import * as fs from "fs";
import * as crypto from "crypto";

export interface AdvancedAnalysisResult {
  isClean: boolean;
  threats: string[];
  confidence: number; // 0-100
  analysisType: string[];
}

export class AdvancedSecurityAnalyzer {
  // Known malware signatures (simplified for demonstration)
  private malwareSignatures = [
    // Real malware patterns
    {
      name: "EICAR Test",
      pattern:
        /X5O!P%@AP\[4\\PZX54\(P\^\)7CC\)7\}\$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!\$H\+H\*/,
    },
    {
      name: "PE Executable",
      pattern: /^MZ.*This program cannot be run in DOS mode/,
    },
    { name: "ELF Executable", pattern: /^\x7fELF/ },

    // Specific malware families
    {
      name: "Conficker Worm",
      pattern: /\x83\xEC\x18\x53\x55\x56\x57\x8B\x7C\x24\x2C/,
    },
    {
      name: "Zeus Banking Trojan",
      pattern:
        /SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Browser Helper Objects/,
    },
    { name: "Stuxnet", pattern: /\x33\xC0\x64\x8B\x40\x30\x85\xC0\x78\x0C/ },

    // Script-based malware
    {
      name: "Malicious PowerShell",
      pattern: /powershell.*-encodedcommand.*-exec.*bypass/gi,
    },
    {
      name: "Malicious VBScript",
      pattern: /createobject.*wscript\.shell.*-windowstyle.*hidden/gi,
    },
    {
      name: "PHP Backdoor",
      pattern: /eval\s*\(\s*base64_decode\s*\(\s*\$_POST/gi,
    },
  ];

  // Suspicious patterns that need deeper analysis
  private suspiciousPatterns = [
    {
      name: "Base64 Encoded Data",
      pattern: /[A-Za-z0-9+\/]{100,}={0,2}/,
      severity: "low",
    },
    { name: "Hex Encoded Data", pattern: /[0-9A-Fa-f]{200,}/, severity: "low" },
    {
      name: "Obfuscated JavaScript",
      pattern: /eval\s*\(\s*unescape\s*\(/,
      severity: "medium",
    },
    {
      name: "Suspicious URLs",
      pattern: /https?:\/\/[a-z0-9-]+\.(tk|ml|ga|cf)\/[a-z0-9]{10,}/gi,
      severity: "medium",
    },
  ];

  async analyzeFile(
    filePath: string,
    originalName: string,
    mimeType: string,
  ): Promise<AdvancedAnalysisResult> {
    const result: AdvancedAnalysisResult = {
      isClean: true,
      threats: [],
      confidence: 100,
      analysisType: [],
    };

    try {
      const buffer = fs.readFileSync(filePath);

      // 1. Signature-based detection (like ClamAV)
      await this.performSignatureAnalysis(buffer, result);

      // 2. Steganography detection
      if (mimeType.startsWith("image/")) {
        await this.performSteganographyAnalysis(filePath, buffer, result);
      }

      // 3. Metadata analysis
      await this.performMetadataAnalysis(
        buffer,
        originalName,
        mimeType,
        result,
      );

      // 4. Behavioral pattern analysis
      await this.performBehavioralAnalysis(buffer, result);

      // 5. File structure analysis
      await this.performStructuralAnalysis(buffer, mimeType, result);

      // Calculate final confidence
      this.calculateConfidence(result);
    } catch (error) {
      console.error("[ADVANCED ANALYSIS] Error:", error);
      result.threats.push(
        "Analysis failed - file may be corrupted or malicious",
      );
      result.isClean = false;
      result.confidence = 0;
    }

    return result;
  }

  private async performSignatureAnalysis(
    buffer: Buffer,
    result: AdvancedAnalysisResult,
  ): Promise<void> {
    result.analysisType.push("signature");

    const content = buffer.toString("binary");
    const textContent = buffer.toString(
      "utf-8",
      0,
      Math.min(buffer.length, 50000),
    );

    // Check against known malware signatures
    for (const signature of this.malwareSignatures) {
      if (
        signature.pattern.test(content) ||
        signature.pattern.test(textContent)
      ) {
        result.threats.push(`Known malware detected: ${signature.name}`);
        result.isClean = false;
      }
    }
  }

  private async performSteganographyAnalysis(
    filePath: string,
    buffer: Buffer,
    result: AdvancedAnalysisResult,
  ): Promise<void> {
    result.analysisType.push("steganography");

    try {
      // Check for suspicious data appended to image files (more specific)
      const metadata = await sharp(filePath).metadata();

      if (metadata.size && buffer.length > metadata.size * 2.5) {
        // File is significantly larger than expected for image data (increased threshold)
        const suspiciousData = buffer.subarray(Math.floor(buffer.length * 0.9));
        const suspiciousText = suspiciousData.toString("utf-8");

        // Look for clear signs of hidden executable code (more specific)
        const hasExecutableSignatures =
          /^MZ.*This program cannot be run in DOS mode|^\x7fELF/.test(
            suspiciousText,
          );
        const hasScriptPayload =
          suspiciousText.includes("eval(") &&
          suspiciousText.includes("base64_decode");

        if (hasExecutableSignatures || hasScriptPayload) {
          result.threats.push(
            "Steganography detected: Suspicious data appended to image",
          );
          result.isClean = false;
        } else if (buffer.length > metadata.size * 3) {
          // Very large difference - just reduce confidence, don't block
          result.confidence -= 20;
        }
      }

      // Check for suspicious metadata in image (more lenient)
      if (metadata.exif) {
        const exifString = JSON.stringify(metadata.exif);

        // Increased threshold for EXIF size (cameras can have large EXIF data)
        if (exifString.length > 50000) {
          result.threats.push(
            "Suspicious EXIF data size - possible hidden payload",
          );
          result.isClean = false;
        } else if (exifString.length > 20000) {
          result.confidence -= 10; // Just reduce confidence, don't block
        }

        // Check for clearly malicious patterns in EXIF (more specific)
        const maliciousPatterns = [
          /javascript:\s*eval\(/gi,
          /vbscript:\s*execute\(/gi,
          /data:text\/html.*<script/gi,
          /<script.*eval\(/gi,
        ];

        for (const pattern of maliciousPatterns) {
          if (pattern.test(exifString)) {
            result.threats.push("Malicious script found in image metadata");
            result.isClean = false;
            break;
          }
        }
      }
    } catch (error) {
      // If sharp can't process it, but it claims to be an image, that's suspicious
      result.threats.push(
        "Image file corrupted or invalid - possible format spoofing",
      );
      result.confidence -= 20;
    }
  }

  private async performMetadataAnalysis(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    result: AdvancedAnalysisResult,
  ): Promise<void> {
    result.analysisType.push("metadata");

    // Check for suspicious filename patterns
    const suspiciousNames = [
      /\.(exe|scr|bat|cmd|com|pif|vbs|jar)$/i,
      /\.(exe|scr|bat|cmd|com|pif|vbs)\.(jpg|png|gif|pdf|doc|txt)$/i, // Double extension
      /invoice|receipt|document.*\.(exe|scr|zip)$/i,
      /photo.*\.(exe|scr|bat)$/i,
    ];

    for (const pattern of suspiciousNames) {
      if (pattern.test(fileName)) {
        result.threats.push(`Suspicious filename pattern: ${fileName}`);
        result.isClean = false;
      }
    }

    // Check file headers vs declared MIME type
    const magicBytes = buffer.subarray(0, 10);
    const actualType = this.detectFileType(magicBytes);

    if (
      actualType &&
      actualType !== mimeType &&
      !this.isAcceptableMismatch(actualType, mimeType)
    ) {
      result.threats.push(
        `File type spoofing: Claims to be ${mimeType} but is ${actualType}`,
      );
      result.isClean = false;
    }
  }

  private async performBehavioralAnalysis(
    buffer: Buffer,
    result: AdvancedAnalysisResult,
  ): Promise<void> {
    result.analysisType.push("behavioral");

    const content = buffer.toString(
      "utf-8",
      0,
      Math.min(buffer.length, 100000),
    );

    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.pattern.test(content)) {
        const threat = `Suspicious pattern detected: ${pattern.name} (${pattern.severity} risk)`;

        if (pattern.severity === "high") {
          result.threats.push(threat);
          result.isClean = false;
        } else if (pattern.severity === "medium") {
          result.confidence -= 15;
        } else {
          result.confidence -= 5;
        }
      }
    }

    // Check for multiple suspicious indicators (higher risk)
    const suspiciousCount = this.suspiciousPatterns.filter((p) =>
      p.pattern.test(content),
    ).length;
    if (suspiciousCount >= 3) {
      result.threats.push(
        "Multiple suspicious patterns detected - likely malicious",
      );
      result.isClean = false;
    }
  }

  private async performStructuralAnalysis(
    buffer: Buffer,
    mimeType: string,
    result: AdvancedAnalysisResult,
  ): Promise<void> {
    result.analysisType.push("structural");

    // Check for zip bombs and unusual compression ratios
    if (mimeType.includes("zip") || mimeType.includes("rar")) {
      const entropy = this.calculateEntropy(buffer);

      // Very low entropy might indicate a zip bomb
      if (entropy < 2.0) {
        result.threats.push(
          "Potential zip bomb detected - unusually low entropy",
        );
        result.isClean = false;
      }

      // Very high entropy might indicate encrypted/obfuscated content
      if (entropy > 7.8) {
        result.confidence -= 10; // Not necessarily malicious, just suspicious
      }
    }

    // Check for PE executable hidden in other formats (more specific)
    if (
      !mimeType.includes("application/") &&
      !mimeType.startsWith("image/") &&
      !mimeType.startsWith("video/") &&
      !mimeType.startsWith("audio/")
    ) {
      const mzIndex = buffer.indexOf("MZ");
      if (mzIndex !== -1) {
        // Check if this looks like an actual PE header, not just random "MZ"
        const isPossiblePE = this.isPossiblePEExecutable(buffer, mzIndex);
        if (isPossiblePE) {
          result.threats.push("Hidden PE executable detected in file");
          result.isClean = false;
        }
      }
    }
  }

  private calculateConfidence(result: AdvancedAnalysisResult): void {
    // If threats were found, confidence should be low
    if (result.threats.length > 0) {
      result.confidence = Math.max(
        0,
        result.confidence - result.threats.length * 20,
      );
    }

    // Ensure confidence is between 0 and 100
    result.confidence = Math.max(0, Math.min(100, result.confidence));
  }

  private detectFileType(magicBytes: Buffer): string | null {
    const signatures: { [key: string]: Buffer } = {
      "image/jpeg": Buffer.from([0xff, 0xd8, 0xff]),
      "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      "image/gif": Buffer.from([0x47, 0x49, 0x46]),
      "application/pdf": Buffer.from([0x25, 0x50, 0x44, 0x46]),
      "application/zip": Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      "application/x-ms-dos-executable": Buffer.from([0x4d, 0x5a]), // MZ
      "application/x-elf": Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF
    };

    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (magicBytes.subarray(0, signature.length).equals(signature)) {
        return mimeType;
      }
    }

    return null;
  }

  private isAcceptableMismatch(
    actualType: string,
    declaredType: string,
  ): boolean {
    // Some mismatches are acceptable (e.g., JPEG file with PNG extension)
    const acceptableMismatches = [
      ["image/jpeg", "image/png"],
      ["image/png", "image/jpeg"],
      ["application/zip", "application/x-zip-compressed"],
      ["application/zip", "application/octet-stream"],
    ];

    return acceptableMismatches.some(
      ([actual, declared]) =>
        (actualType === actual && declaredType === declared) ||
        (actualType === declared && declaredType === actual),
    );
  }

  private calculateEntropy(buffer: Buffer): number {
    const frequencies: { [key: number]: number } = {};

    // Count byte frequencies
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      frequencies[byte] = (frequencies[byte] || 0) + 1;
    }

    // Calculate entropy
    let entropy = 0;
    const length = buffer.length;

    for (const count of Object.values(frequencies)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private isPossiblePEExecutable(buffer: Buffer, mzIndex: number): boolean {
    // A real PE executable has specific structure after "MZ"
    if (mzIndex + 60 >= buffer.length) return false;

    try {
      // Check for PE signature at the offset specified in the DOS header
      const peOffset = buffer.readUInt32LE(mzIndex + 60);

      // PE offset should be reasonable
      if (peOffset >= buffer.length - 4 || peOffset < 64) return false;

      // Check for "PE\0\0" signature
      const peSignature = buffer.subarray(peOffset, peOffset + 4);
      if (peSignature.toString() === "PE\0\0") {
        // Additional validation: check for DOS stub message
        const dosStubCheck = buffer.subarray(mzIndex + 2, mzIndex + 60);
        if (
          dosStubCheck.includes(
            Buffer.from("This program cannot be run in DOS mode"),
          )
        ) {
          return true;
        }
      }
    } catch (error) {
      // If we can't read the structure properly, it's probably not a PE file
      return false;
    }

    return false;
  }
}

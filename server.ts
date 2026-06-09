import express, { Request, Response } from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini SDK with User-Agent required by the guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Diagnostic Engine
app.post("/api/diagnose", async (req: Request, res: Response): Promise<void> => {
  try {
    const { industry, sensors, logs } = req.body;

    if (!industry || !sensors) {
      res.status(400).json({ error: "Missing active industry or sensor readings snapshot." });
      return;
    }

    // Set up standard instructions as Sentinel Industrial Diagnostic Intelligence agent.
    const prompt = `
      You are the Sentinel Diagnostic Engine, a leading industrial troubleshooting AI.
      You are auditing an active installation in the "${industry}" sector.
      
      Here is the current telemetry snapshot:
      ${JSON.stringify(sensors, null, 2)}
      
      Here are the recent active machine logs, sensor uploads, or sequence events:
      ${JSON.stringify(logs || [], null, 2)}
      
      Examine the values thoroughly. Determine whether there is an operational anomaly, mechanical fault, electrical resonance, HVAC block, or robotic angular backlash.
      If any metric deviates from healthy boundaries, classify the fault, specify the probability score (0-100), formulate the precise physical/electrical root cause, draft progressive checklists to troubleshoot/repair, outline long-term preventive actions, recommend a schedule for maintenance (e.g. immediate shift-shutoff, or next calendar cycle), and rate the overall system safety risk (Low, Medium, High, or Critical).
      
      If telemetry looks stable and within nominal boundaries, you may output "faultDetected: false", with an assessment that the system is stable with zero critical incidents.
    `;

    const systemInstruction = `
      You are a specialized industrial diagnostic engineer acting as the premium 'Sentinel Diagnostic Core'.
      Analyze sensor streams and machine log lines. You must strictly output standard JSON conforming to the requested schema.
      Keep descriptions highly mechanical, precise, and practical for field technicians. Do not use generic explanations or verbose preachy paragraphs.
    `;

    // Retrieve structured diagnostic assessment via Gemini API
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faultDetected: {
              type: Type.BOOLEAN,
              description: "Whether a fault, degradation, or abnormal deviation was identified in the system state."
            },
            failureCategory: {
              type: Type.STRING,
              description: "High-level classification of the physical issue, e.g., 'Bearing Lubrication Failure', 'Phase Imbalance', etc. If none, output 'Operational Nominal'."
            },
            probabilityScore: {
              type: Type.INTEGER,
              description: "Confidence percentage of the identified diagnosis, ranging from 0 to 100."
            },
            rootCause: {
              type: Type.STRING,
              description: "Exact scientific, physical, mechanical, thermal, or electronic cause behind the readings."
            },
            suggestedFixes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A concrete list of troubleshooting or maintenance tasks a floor technician should complete."
            },
            preventiveAction: {
              type: Type.STRING,
              description: "Proactive mechanical corrections, modifications, or calibrations to prevent recurring faults."
            },
            maintenanceSchedule: {
              type: Type.STRING,
              description: "Time frame or shift pattern when this maintenance action should be executed (e.g., 'Immediate Emergency Halt', 'Next 24h Shutdown', 'Routine Monthly Recalibrate')."
            },
            riskAssessment: {
              type: Type.STRING,
              description: "System hazard severity level. Strictly one of: 'Low', 'Medium', 'High', 'Critical'."
            }
          },
          required: [
            "faultDetected",
            "failureCategory",
            "probabilityScore",
            "rootCause",
            "suggestedFixes",
            "preventiveAction",
            "maintenanceSchedule",
            "riskAssessment"
          ]
        }
      }
    });

    const reportText = aiResponse.text;
    if (!reportText) {
      throw new Error("No response returned from the Diagnostic Model.");
    }

    try {
      const parsedReport = JSON.parse(reportText.trim());
      res.json(parsedReport);
    } catch (parseErr) {
      console.error("Failed to parse diagnostic JSON output:", reportText);
      res.status(500).json({
        error: "AI diagnostic generation was completed but output was malformed.",
        rawOutput: reportText
      });
    }
  } catch (error: any) {
    console.error("Diagnostic engine execution failure:", error);
    res.status(500).json({ error: error?.message || "An unexpected error occurred during diagnostic evaluation." });
  }
});

// API: Live Chat Troubleshooter
app.post("/api/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Missing chat session message history." });
      return;
    }

    const compiledHistory = messages.map(msg => `${msg.sender === 'operator' ? 'Operator' : 'AI'}: ${msg.text}`).join("\n");

    const prompt = `
      You are the Sentinel Diagnostic Core Companion, a helpful AI stationed inside an active industrial control cell.
      The terminal operator is discussing system operations and the active fault status with you.
      
      == SYSTEM PROFILE ==
      Industry: ${context?.industry || "General Industry"}
      Last Saved Diagnostic Assessment: ${context?.latestReport ? JSON.stringify(context.latestReport) : "No faults detected in active shift yet."}
      Active Telemetry Snapshot: ${context?.sensors ? JSON.stringify(context.sensors) : "Sensors Nominal"}
      ====================
      
      Here is the conversation so far:
      ${compiledHistory}
      
      Respond directly to the last question or statement by the Operator.
      Keep your answer highly visual, professional, clear, and actionable. Provide technical guidance, step sequences, valve schematics descriptions, or sensor boundaries as requested.
      Be crisp and informative. Avoid marketing fluff or preachy safety lectures. Speak like a lead controls engineer.
    `;

    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the Sentinel Companion AI inside an industrial control dashboard. Help operators inspect and clear active warning alarms.",
      }
    });

    res.json({ text: aiResponse.text || "Diagnostic database is stable. Please query detailed metrics if required." });
  } catch (err: any) {
    console.error("Troubleshooting chat failure:", err);
    res.status(500).json({ error: err?.message || "Fault logging service is temporarily unavailable." });
  }
});

// Serve frontend with Vite in development and static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Fault Diagnosis System running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

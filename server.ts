import express from "express";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { Client } from "ssh2";
import http from "http";
import fs from "fs";
import os from "os";

const DATA_FILE = path.join(os.homedir(), ".net-term-data.json");

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: '10mb' }));

  // Add a simple health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/data", (req, res) => {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json({});
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data", (req, res) => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to write data" });
    }
  });

  const server = http.createServer(app);
  
  // WebSocket server for SSH proxying
  const wss = new WebSocketServer({ server, path: "/api/ssh" });

  wss.on("connection", (ws: WebSocket) => {
    let sshClient: Client | null = null;
    let sshStream: any = null;

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === "connect") {
          const { host, port, username, password } = data.payload;
          sshClient = new Client();
          
          sshClient.on("ready", () => {
            ws.send(JSON.stringify({ type: "status", payload: "connected" }));
            
            sshClient!.shell((err, stream) => {
              if (err) {
                ws.send(JSON.stringify({ type: "error", payload: "Shell error: " + err.message }));
                return;
              }
              sshStream = stream;
              
              stream.on("close", () => {
                ws.send(JSON.stringify({ type: "status", payload: "closed" }));
                sshClient!.end();
              }).on("data", (data: any) => {
                ws.send(JSON.stringify({ type: "data", payload: data.toString("base64") }));
              }).stderr.on("data", (data: any) => {
                ws.send(JSON.stringify({ type: "data", payload: data.toString("base64") }));
              });
            });
          }).on("error", (err) => {
            ws.send(JSON.stringify({ type: "error", payload: "SSH Connection error: " + err.message }));
          }).on("close", () => {
             ws.send(JSON.stringify({ type: "status", payload: "closed" }));
          });

          sshClient.connect({
            host,
            port: port || 22,
            username,
            password,
            readyTimeout: 10000,
            algorithms: {
              kex: ['diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1', 'diffie-hellman-group-exchange-sha1', 'diffie-hellman-group-exchange-sha256', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'curve25519-sha256', 'curve25519-sha256@libssh.org'],
              cipher: ['aes128-cbc', 'aes192-cbc', 'aes256-cbc', 'aes128-ctr', 'aes192-ctr', 'aes256-ctr', '3des-cbc'],
              serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519'],
              hmac: ['hmac-sha1', 'hmac-sha1-96', 'hmac-md5', 'hmac-md5-96', 'hmac-sha2-256', 'hmac-sha2-512']
            }
          });
        } else if (data.type === "data" && sshStream) {
          // Input from terminal to SSH
          const buf = Buffer.from(data.payload, "base64");
          sshStream.write(buf);
        } else if (data.type === "resize" && sshStream) {
          sshStream.setWindow(data.payload.rows, data.payload.cols, data.payload.height, data.payload.width);
        }
      } catch (err) {
        console.error("WS Message error", err);
      }
    });

    ws.on("close", () => {
      if (sshClient) {
        sshClient.end();
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

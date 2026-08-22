import { connect } from "cloudflare:sockets";

const SMTP_HOST = "smtppro.zoho.com";
const SMTP_PORT = 465;

const FROM_EMAIL = "ops@trustcitytownship.com";
const TO_EMAIL = "ops@trustcitytownship.com";

function base64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

async function readSMTP(reader) {
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      throw new Error("SMTP connection closed unexpectedly");
    }

    buffer += new TextDecoder().decode(value);

    const lines = buffer.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^\d{3} /.test(line)) {
        return line;
      }
    }
  }
}

async function smtpCommand(writer, reader, command) {
  await writer.write(
    new TextEncoder().encode(command + "\r\n")
  );

  const response = await readSMTP(reader);

  if (!/^[23]/.test(response)) {
    throw new Error("SMTP error: " + response);
  }

  return response;
}

async function sendZohoEmail(env, subject, textBody) {
  const socket = connect(
    {
      hostname: SMTP_HOST,
      port: SMTP_PORT
    },
    {
      secureTransport: "on",
      allowHalfOpen: false
    }
  );

  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();

  try {
    // Server greeting
    const greeting = await readSMTP(reader);

    if (!greeting.startsWith("220")) {
      throw new Error("SMTP greeting failed: " + greeting);
    }

    // EHLO
    await smtpCommand(
      writer,
      reader,
      "EHLO trustcitytownship.com"
    );

    // LOGIN authentication
    await writer.write(
      new TextEncoder().encode("AUTH LOGIN\r\n")
    );

    let response = await readSMTP(reader);

    if (!response.startsWith("334")) {
      throw new Error(
        "SMTP AUTH LOGIN failed: " + response
      );
    }

    await writer.write(
      new TextEncoder().encode(
        base64(env.ZOHO_EMAIL) + "\r\n"
      )
    );

    response = await readSMTP(reader);

    if (!response.startsWith("334")) {
      throw new Error(
        "SMTP username rejected: " + response
      );
    }

    await writer.write(
      new TextEncoder().encode(
        base64(env.ZOHO_PASSWORD) + "\r\n"
      )
    );

    response = await readSMTP(reader);

    if (!response.startsWith("235")) {
      throw new Error(
        "SMTP password rejected: " + response
      );
    }

    // Sender
    await smtpCommand(
      writer,
      reader,
      `MAIL FROM:<${FROM_EMAIL}>`
    );

    // Recipient
    await smtpCommand(
      writer,
      reader,
      `RCPT TO:<${TO_EMAIL}>`
    );

    // DATA
    await writer.write(
      new TextEncoder().encode("DATA\r\n")
    );

    response = await readSMTP(reader);

    if (!response.startsWith("354")) {
      throw new Error(
        "SMTP DATA rejected: " + response
      );
    }

    const safeBody = textBody
      .replace(/\r?\n/g, "\r\n")
      .replace(/^\./gm, "..");

    const email = [
      `From: Trust City Website <${FROM_EMAIL}>`,
      `To: ${TO_EMAIL}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      safeBody,
      "."
    ].join("\r\n");

    await writer.write(
      new TextEncoder().encode(email + "\r\n")
    );

    response = await readSMTP(reader);

    if (!response.startsWith("250")) {
      throw new Error(
        "Email was not accepted: " + response
      );
    }

    await writer.write(
      new TextEncoder().encode("QUIT\r\n")
    );

    return true;

  } finally {
    try {
      writer.releaseLock();
      reader.releaseLock();
    } catch {}

    try {
      socket.close();
    } catch {}
  }
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    }
  );
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // Handle API
    if (url.pathname === "/api/enquiry") {

      if (request.method === "OPTIONS") {
        return json({ success: true });
      }

      if (request.method !== "POST") {
        return json(
          { success: false, error: "Method not allowed" },
          405
        );
      }

      try {
        const data = await request.json();

        const name = String(data.name || "").trim();
        const phone = String(data.phone || "").trim();
        const interest = String(data.interest || "").trim();
        const message = String(data.message || "").trim();

        if (!name || !phone) {
          return json(
            {
              success: false,
              error: "Name and phone are required"
            },
            400
          );
        }

        const subject =
          `New Trust City Enquiry - ${name}`;

        const body = `
NEW TRUST CITY WEBSITE ENQUIRY

Name: ${name}
Phone: ${phone}
Interest: ${interest || "Not specified"}

Message:
${message || "No message provided"}

Source:
Trust City Township Website
        `.trim();

        await sendZohoEmail(
          env,
          subject,
          body
        );

        return json({
          success: true,
          message: "Enquiry submitted successfully"
        });

      } catch (error) {

    console.error(
        "Enquiry error:",
        error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack || ""}`
            : JSON.stringify(error)
    );

        return json(
          {
            success: false,
            error: "Unable to send enquiry"
          },
          500
        );
      }
    }

    // Send site-visit requests using the same endpoint
    if (url.pathname === "/api/site-visit") {

      if (request.method === "OPTIONS") {
        return json({ success: true });
      }

      if (request.method !== "POST") {
        return json(
          { success: false, error: "Method not allowed" },
          405
        );
      }

      try {

        const data = await request.json();

        const name = String(data.name || "").trim();
        const phone = String(data.phone || "").trim();
        const date = String(data.date || "").trim();
        const time = String(data.time || "").trim();
        const message = String(data.message || "").trim();

        if (!name || !phone || !date || !time) {
          return json(
            {
              success: false,
              error:
                "Name, phone, date and time are required"
            },
            400
          );
        }

        const subject =
          `New Site Visit Request - ${name}`;

        const body = `
NEW TRUST CITY SITE VISIT REQUEST

Name: ${name}
Phone: ${phone}

Preferred Date: ${date}
Preferred Time: ${time}

Message:
${message || "No specific requirement"}

Source:
Trust City Township Website
        `.trim();

        await sendZohoEmail(
          env,
          subject,
          body
        );

        return json({
          success: true,
          message:
            "Site visit request submitted successfully"
        });

      } catch (error) {

    console.error(
        "Site visit error:",
        error instanceof Error
            ? `${error.name}: ${error.message}\n${error.stack || ""}`
            : JSON.stringify(error)
    );
        return json(
          {
            success: false,
            error: "Unable to send site visit request"
          },
          500
        );
      }
    }

    // Everything else = your existing website
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", {
      status: 404
    });
  }
};
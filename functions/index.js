const {onRequest} = require("firebase-functions/v2/https");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Función para enviar credenciales por email
 * Envía las credenciales de nuevos usuarios a su correo personal
 */
exports.enviarCredenciales = onRequest({
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:4173",
      "https://viajeseguro-b204d.web.app",
      "https://viajeseguro-b204d.firebaseapp.com",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
}, async (req, res) => {
  // Log de inicio
  logger.info("🚀 Iniciando función enviarCredenciales", {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  // Verificar método HTTP
  if (req.method !== "POST") {
    logger.warn("❌ Método no permitido:", req.method);
    return res.status(405).json({
      success: false,
      message: "Método no permitido. Use POST.",
    });
  }

  try {
    // Extraer datos del body
    const {
      destinatario,
      nombreCompleto,
      emailCorporativo,
      passwordTemporal,
      tipo,
    } = req.body;

    // Log de datos recibidos
    logger.info("📋 Datos recibidos:", {
      destinatario,
      nombreCompleto,
      emailCorporativo,
      tipo,
      hasPassword: !!passwordTemporal,
    });

    // Validar datos requeridos
    if (!destinatario || !nombreCompleto || !emailCorporativo || !passwordTemporal) {
      logger.error("❌ Faltan datos requeridos");
      return res.status(400).json({
        success: false,
        message: "Faltan datos requeridos: destinatario, nombreCompleto, emailCorporativo, passwordTemporal",
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destinatario)) {
      logger.error("❌ Email destinatario inválido:", destinatario);
      return res.status(400).json({
        success: false,
        message: "El email del destinatario no es válido",
      });
    }

    if (!emailRegex.test(emailCorporativo)) {
      logger.error("❌ Email corporativo inválido:", emailCorporativo);
      return res.status(400).json({
        success: false,
        message: "El email corporativo no es válido",
      });
    }

    // Obtener configuración de Gmail
    const functions = require("firebase-functions");
    const gmailUser = functions.config().gmail?.user;
    const gmailPass = functions.config().gmail?.pass;

    logger.info("🔧 Configuración Gmail:", {
      hasUser: !!gmailUser,
      hasPass: !!gmailPass,
      userEmail: gmailUser ? gmailUser.substring(0, 3) + "***" : "undefined",
    });

    if (!gmailUser || !gmailPass) {
      logger.error("❌ Configuración de Gmail no encontrada");
      logger.error("💡 Ejecute: firebase functions:config:set gmail.user=EMAIL gmail.pass=PASSWORD");
      return res.status(500).json({
        success: false,
        message: "Configuración de email no encontrada en el servidor",
      });
    }

    // Configurar nodemailer
    const nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    logger.info("📧 Transporter configurado");

    // Verificar conexión
    await transporter.verify();
    logger.info("✅ Conexión SMTP verificada");

    // Configurar email
    const mailOptions = {
      from: `"ViajeSeguro - Sistema de Administración" <${gmailUser}>`,
      to: destinatario,
      subject: `🔐 Credenciales de Acceso - ViajeSeguro (${tipo})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Credenciales de Acceso - ViajeSeguro</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2c5530 0%, #4a7c59 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚗 ViajeSeguro</h1>
              <p style="color: #e8f5e8; margin: 5px 0 0 0; font-size: 16px;">Sistema de Administración</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #2c5530; margin: 0 0 10px 0; font-size: 24px;">¡Bienvenido/a al Sistema!</h2>
                <p style="color: #666; margin: 0; font-size: 16px;">Sus credenciales de acceso han sido generadas</p>
              </div>
              
              <!-- User Info -->
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #4a7c59;">
                <h3 style="color: #2c5530; margin: 0 0 15px 0; font-size: 18px;">📋 Información del Usuario</h3>
                <p style="margin: 8px 0; font-size: 15px;"><strong>👤 Nombre:</strong> ${nombreCompleto}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>🎭 Tipo de Usuario:</strong> ${tipo}</p>
                <p style="margin: 8px 0; font-size: 15px;"><strong>📧 Correo Personal:</strong> ${destinatario}</p>
              </div>
              
              <!-- Credentials -->
              <div style="background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border-radius: 8px; padding: 25px; margin-bottom: 25px; border: 2px solid #4a7c59;">
                <h3 style="color: #2c5530; margin: 0 0 20px 0; font-size: 18px; text-align: center;">🔐 Sus Credenciales de Acceso</h3>
                
                <div style="background: white; border-radius: 6px; padding: 15px; margin-bottom: 15px; border: 1px solid #ddd;">
                  <p style="margin: 0 0 5px 0; font-size: 14px; color: #666; font-weight: bold;">CORREO ELECTRÓNICO:</p>
                  <p style="margin: 0; font-size: 16px; color: #2c5530; font-family: 'Courier New', monospace; font-weight: bold;">${emailCorporativo}</p>
                </div>
                
                <div style="background: white; border-radius: 6px; padding: 15px; border: 1px solid #ddd;">
                  <p style="margin: 0 0 5px 0; font-size: 14px; color: #666; font-weight: bold;">CONTRASEÑA TEMPORAL:</p>
                  <p style="margin: 0; font-size: 16px; color: #d63384; font-family: 'Courier New', monospace; font-weight: bold; background: #fff3cd; padding: 8px; border-radius: 4px; border: 1px solid #ffeaa7;">${passwordTemporal}</p>
                </div>
              </div>
              
              <!-- Instructions -->
              <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">⚠️ Instrucciones Importantes</h3>
                <ol style="margin: 0; padding-left: 20px; color: #856404;">
                  <li style="margin-bottom: 8px;">Acceda al sistema usando las credenciales proporcionadas</li>
                  <li style="margin-bottom: 8px;"><strong>DEBE cambiar su contraseña</strong> en el primer inicio de sesión</li>
                  <li style="margin-bottom: 8px;">La nueva contraseña debe cumplir los requisitos de seguridad</li>
                  <li style="margin-bottom: 8px;">Mantenga sus credenciales seguras y no las comparta</li>
                  <li>Contacte al administrador si tiene problemas de acceso</li>
                </ol>
              </div>
              
              <!-- Security Requirements -->
              <div style="background-color: #d1ecf1; border-radius: 8px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #17a2b8;">
                <h3 style="color: #0c5460; margin: 0 0 15px 0; font-size: 16px;">🔒 Requisitos de Contraseña</h3>
                <ul style="margin: 0; padding-left: 20px; color: #0c5460; font-size: 14px;">
                  <li>Mínimo 8 caracteres</li>
                  <li>Al menos una letra mayúscula</li>
                  <li>Al menos una letra minúscula</li>
                  <li>Al menos un número</li>
                  <li>Al menos un carácter especial (!@#$%^&*)</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #4a7c59 0%, #2c5530 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                  🚀 Acceder al Sistema
                </a>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                📧 Este es un correo automático del sistema ViajeSeguro<br>
                🔐 Por su seguridad, no responda a este correo
              </p>
              <p style="margin: 10px 0 0 0; color: #adb5bd; font-size: 12px;">
                © ${new Date().getFullYear()} ViajeSeguro - Sistema de Administración
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `,
    };

    logger.info("📤 Enviando email...", {
      from: mailOptions.from,
      to: destinatario,
      subject: mailOptions.subject,
    });

    // Enviar email
    const info = await transporter.sendMail(mailOptions);

    logger.info("✅ Email enviado exitosamente:", {
      messageId: info.messageId,
      response: info.response,
    });

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: "Credenciales enviadas exitosamente",
      data: {
        messageId: info.messageId,
        destinatario: destinatario,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("❌ Error en enviarCredenciales:", {
      error: error.message,
      stack: error.stack,
      code: error.code,
    });

    res.status(500).json({
      success: false,
      message: "Error interno del servidor al enviar credenciales",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * Función de salud para verificar el estado del servicio
 */
exports.health = onRequest((req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Firebase Functions funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});
// functions/index.js
const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const cors = require('cors');

// Configurar CORS para permitir peticiones desde tu dominio
const corsHandler = cors({
  origin: [
    'http://localhost:3000',
    'https://viajeseguro-b204d.web.app',
    'https://viajeseguro-b204d.firebaseapp.com'
  ],
  credentials: true
});

// 📧 FUNCIÓN PARA ENVIAR CREDENCIALES POR EMAIL
exports.enviarCredenciales = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    // Solo permitir método POST
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        message: 'Método no permitido. Use POST.'
      });
    }

    try {
      console.log('📧 ========================================');
      console.log('📧 FUNCIÓN FIREBASE: ENVIAR CREDENCIALES');
      console.log('📧 ========================================');
      
      const { 
        destinatario, 
        emailCorporativo, 
        passwordTemporal, 
        nombreCompleto, 
        tipo 
      } = req.body;

      // Validar datos requeridos
      if (!destinatario || !emailCorporativo || !passwordTemporal || !nombreCompleto) {
        console.log('❌ Datos faltantes en la petición');
        return res.status(400).json({
          success: false,
          message: 'Datos faltantes: destinatario, emailCorporativo, passwordTemporal y nombreCompleto son requeridos'
        });
      }

      console.log('📮 Destinatario:', destinatario);
      console.log('👤 Nombre:', nombreCompleto);
      console.log('📧 Email corporativo:', emailCorporativo);
      console.log('🎭 Tipo:', tipo);

      // 🔧 CONFIGURACIÓN DE NODEMAILER
      // IMPORTANTE: Usa Gmail App Password o servicio SMTP de tu elección
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: functions.config().gmail.user, // Configurado con firebase functions:config:set
          pass: functions.config().gmail.pass  // App Password de Gmail
        }
      });

      // 📄 PLANTILLA DEL EMAIL
      const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Credenciales Viaje Seguro</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #007293 0%, #009688 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 30px;
            }
            .credentials-box {
              background: #e0f2f1;
              border: 1px solid #b2dfdb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #007293;
            }
            .credential-item {
              margin: 10px 0;
              padding: 10px;
              background: white;
              border-radius: 4px;
              font-family: monospace;
              word-break: break-all;
            }
            .warning {
              background: #fff3e0;
              border: 1px solid #ffcc02;
              border-radius: 8px;
              padding: 15px;
              margin: 20px 0;
              border-left: 4px solid #ff9800;
            }
            .footer {
              background: #f5f5f5;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .btn {
              display: inline-block;
              padding: 12px 24px;
              background: #007293;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 10px 0;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 VIAJE SEGURO</h1>
              <p>Credenciales de Acceso al Sistema</p>
            </div>
            
            <div class="content">
              <h2>¡Hola ${nombreCompleto}!</h2>
              
              <p>Te damos la bienvenida al sistema <strong>Viaje Seguro</strong>. Has sido registrado como <strong>${tipo}</strong> en nuestra plataforma.</p>
              
              <div class="credentials-box">
                <h3>🔐 Tus Credenciales de Acceso:</h3>
                
                <p><strong>📧 Email Corporativo:</strong></p>
                <div class="credential-item">${emailCorporativo}</div>
                
                <p><strong>🔑 Contraseña Temporal:</strong></p>
                <div class="credential-item">${passwordTemporal}</div>
              </div>
              
              <div class="warning">
                <h4>⚠️ Información Importante:</h4>
                <ul>
                  <li><strong>Debes cambiar tu contraseña</strong> en el primer inicio de sesión</li>
                  <li>Esta contraseña es <strong>temporal y única</strong></li>
                  <li>No compartas estas credenciales con terceros</li>
                  <li>Si tienes problemas, contacta al administrador del sistema</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://viajeseguro-b204d.web.app/login" class="btn">
                  🚀 Acceder al Sistema
                </a>
              </div>
              
              <p>Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #007293;">
                https://viajeseguro-b204d.web.app/login
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Viaje Seguro</strong> - Sistema de Gestión de Transporte</p>
              <p>Este es un email automático, no responder a esta dirección.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 📨 CONFIGURACIÓN DEL EMAIL
      const mailOptions = {
        from: `"Viaje Seguro Sistema" <${functions.config().gmail.user}>`,
        to: destinatario,
        subject: `🔐 Credenciales de acceso - Viaje Seguro (${tipo})`,
        html: htmlTemplate,
        // Versión texto plano como respaldo
        text: `
Hola ${nombreCompleto},

Te damos la bienvenida al sistema Viaje Seguro.
Has sido registrado como ${tipo}.

Tus credenciales de acceso:
📧 Email: ${emailCorporativo}
🔑 Contraseña: ${passwordTemporal}

⚠️ IMPORTANTE:
- Debes cambiar tu contraseña en el primer inicio de sesión
- Esta contraseña es temporal y única
- No compartas estas credenciales

Accede al sistema en: https://viajeseguro-b204d.web.app/login

Viaje Seguro - Sistema de Gestión de Transporte
        `
      };

      // 🚀 ENVIAR EMAIL
      console.log('📤 Enviando email...');
      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email enviado exitosamente');
      console.log('📧 Message ID:', info.messageId);
      console.log('📮 Destinatario confirmado:', destinatario);

      return res.status(200).json({
        success: true,
        message: 'Credenciales enviadas exitosamente',
        messageId: info.messageId,
        destinatario: destinatario
      });

    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ ERROR AL ENVIAR EMAIL');
      console.error('❌ ========================================');
      console.error('❌ Error completo:', error);
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Stack:', error.stack);

      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor al enviar email',
        error: error.message
      });
    }
  });
});

// 🧪 FUNCIÓN DE PRUEBA (opcional)
exports.testEmail = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      console.log('🧪 Función de prueba de email ejecutada');
      
      return res.status(200).json({
        success: true,
        message: 'Firebase Functions funcionando correctamente',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error en función de prueba',
        error: error.message
      });
    }
  });
});
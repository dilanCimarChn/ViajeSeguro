// 🧪 SCRIPT DE PRUEBA PARA CONFIGURACIÓN DE EMAIL
// backend/test-email-config.js
// Ejecutar con: node test-email-config.js

require('dotenv').config();
const { createEmailTransporter, verifyEmailConnection } = require('./config/email');
const { getWelcomeEmailTemplate } = require('./templates/emailTemplate');

// Colores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const testEmailConfiguration = async () => {
  log('cyan', '🧪 =====================================');
  log('cyan', '🧪 PRUEBA DE CONFIGURACIÓN DE EMAIL');
  log('cyan', '🧪 =====================================');
  
  try {
    // 1. Verificar variables de entorno
    log('yellow', '\n📋 1. Verificando variables de entorno...');
    
    const requiredVars = {
      'EMAIL_USER': process.env.EMAIL_USER,
      'EMAIL_PASSWORD': process.env.EMAIL_PASSWORD,
      'EMAIL_HOST': process.env.EMAIL_HOST,
      'EMAIL_PORT': process.env.EMAIL_PORT
    };
    
    let configValid = true;
    
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value) {
        log('red', `   ❌ ${key}: No configurado`);
        configValid = false;
      } else if (key === 'EMAIL_PASSWORD') {
        log('green', `   ✅ ${key}: Configurado (${value.length} caracteres)`);
      } else {
        log('green', `   ✅ ${key}: ${value}`);
      }
    }
    
    if (!configValid) {
      log('red', '\n❌ Configuración incompleta. Revisa tu archivo .env');
      return;
    }
    
    // 2. Crear transportador
    log('yellow', '\n📧 2. Creando transportador de email...');
    const transporter = createEmailTransporter();
    log('green', '   ✅ Transportador creado exitosamente');
    
    // 3. Verificar conexión
    log('yellow', '\n🔗 3. Verificando conexión con Gmail...');
    const isConnected = await verifyEmailConnection(transporter);
    
    if (!isConnected) {
      log('red', '   ❌ No se pudo conectar con Gmail');
      log('yellow', '\n🔧 POSIBLES SOLUCIONES:');
      log('yellow', '   • Verifica que la verificación en 2 pasos esté habilitada');
      log('yellow', '   • Regenera la contraseña de aplicación');
      log('yellow', '   • Confirma que EMAIL_USER y EMAIL_PASSWORD sean correctos');
      return;
    }
    
    log('green', '   ✅ Conexión con Gmail exitosa');
    
    // 4. Pregunta si quiere enviar email de prueba
    log('yellow', '\n📮 4. ¿Enviar email de prueba?');
    log('blue', '   Para enviar un email de prueba, modifica la variable testEmail abajo');
    
    // CAMBIA ESTA VARIABLE POR TU EMAIL PERSONAL PARA PRUEBA
    const testEmail = "jr.joss1999@gmail.com"; // Ejemplo: 'tu-email-personal@gmail.com'
    
    if (testEmail) {
      log('yellow', `\n📤 Enviando email de prueba a: ${testEmail}`);
      
      const testData = {
        nombreCompleto: 'Usuario de Prueba',
        emailCorporativo: 'usuario.prueba@vseguro.com',
        passwordTemporal: 'TempPass123!',
        tipo: 'Administrador'
      };
      
      const mailOptions = {
        from: {
          name: process.env.COMPANY_NAME || 'Viaje Seguro',
          address: process.env.EMAIL_USER
        },
        to: testEmail,
        subject: '🧪 Prueba de Configuración - Viaje Seguro',
        html: getWelcomeEmailTemplate(testData),
        text: `Prueba de configuración del sistema de emails de Viaje Seguro.\n\nEste es un email de prueba para verificar que la configuración funciona correctamente.`
      };
      
      const result = await transporter.sendMail(mailOptions);
      log('green', `   ✅ Email de prueba enviado exitosamente!`);
      log('green', `   📧 Message ID: ${result.messageId}`);
      log('blue', `   📥 Revisa tu bandeja de entrada en: ${testEmail}`);
      
    } else {
      log('blue', '   ⏭️  Email de prueba omitido (testEmail no configurado)');
    }
    
    // 5. Resumen final
    log('green', '\n🎉 =====================================');
    log('green', '🎉 CONFIGURACIÓN COMPLETADA EXITOSAMENTE');
    log('green', '🎉 =====================================');
    
    log('cyan', '\n📋 RESUMEN:');
    log('green', '   ✅ Variables de entorno configuradas');
    log('green', '   ✅ Transportador de email creado');
    log('green', '   ✅ Conexión con Gmail verificada');
    log(testEmail ? 'green' : 'yellow', `   ${testEmail ? '✅' : '⏭️ '} Email de prueba ${testEmail ? 'enviado' : 'omitido'}`);
    
    log('cyan', '\n🚀 PRÓXIMOS PASOS:');
    log('blue', '   1. Ejecuta: npm run dev');
    log('blue', '   2. Visita: http://localhost:5000/api/status');
    log('blue', '   3. Prueba crear un usuario en el frontend');
    
  } catch (error) {
    log('red', `\n❌ ERROR EN LA PRUEBA: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      log('yellow', '\n🔧 ERROR DE AUTENTICACIÓN:');
      log('yellow', '   • Verifica que EMAIL_USER sea correcto');
      log('yellow', '   • Confirma que EMAIL_PASSWORD sea la contraseña de aplicación (no tu contraseña de Gmail)');
      log('yellow', '   • Asegúrate de que la verificación en 2 pasos esté habilitada');
    } else if (error.code === 'ECONNECTION') {
      log('yellow', '\n🔧 ERROR DE CONEXIÓN:');
      log('yellow', '   • Verifica tu conexión a internet');
      log('yellow', '   • Confirma que no haya firewall bloqueando el puerto 587');
    } else {
      log('yellow', '\n🔧 OTROS ERRORES POSIBLES:');
      log('yellow', '   • Verifica todas las variables en el archivo .env');
      log('yellow', '   • Confirma que el archivo .env esté en la raíz de backend/');
    }
  }
};

// Ejecutar la prueba
if (require.main === module) {
  testEmailConfiguration()
    .then(() => {
      log('cyan', '\n👋 Prueba finalizada. ¡Que tengas un buen día!');
      process.exit(0);
    })
    .catch((error) => {
      log('red', `\n💥 Error inesperado: ${error.message}`);
      process.exit(1);
    });
}

module.exports = testEmailConfiguration;
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// CONFIGURACIÓN PERSONALIZADA
const GLPI_API_URL = 'http://192.168.0.245/glpi/apirest.php'; // Ajusta si es necesario
const GLPI_USER_TOKEN = 'GQbhR7clYKtEMMIGRwSSVKPMuigg1xN0MApEZGFe'; // Sustituye por el tuyo

let session_token = null;

// Iniciar sesión en GLPI
async function iniciarSesionGLPI() {
    try {
        const res = await axios.get(`${GLPI_API_URL}/initSession`, {
            headers: {
                'Authorization': `user_token ${GLPI_USER_TOKEN}`
            }
        });
        session_token = res.data.session_token;
        console.log('✅ Sesión GLPI iniciada');
        return session_token;
    } catch (error) {
        console.error('❌ Error iniciando sesión en GLPI:', error.response?.data || error.message);
        throw error;
    }
}

// Crear un ticket en GLPI
async function crearTicketGLPI(mensaje, remitente) {
    if (!session_token) await iniciarSesionGLPI();

    const ticketData = {
        name: `Ticket desde WhatsApp (${remitente})`,
        content: mensaje,
        urgency: 2,              // Urgencia media
        requesttypes_id: 1,      // Tipo de solicitud (1 = Incidente)
        status: 1,               // Abierto
        entities_id: 0           // Entidad raíz
    };

    try {
        const res = await axios.post(`${GLPI_API_URL}/Ticket`, ticketData, {
            headers: {
                'Session-Token': session_token
            }
        });
        console.log('✅ Ticket creado con ID:', res.data.id);
    } catch (error) {
        console.error('❌ Error al crear ticket:', error.response?.data || error.message);
        throw error;
    }
}

// Webhook que recibe mensajes de Z-API
app.post('/webhook', async (req, res) => {
    console.log('📩 Mensaje recibido de Z-API:', JSON.stringify(req.body, null, 2));

    const { phone, text, fromMe } = req.body;

    if (fromMe || !text?.message) {
        return res.sendStatus(200); // Ignorar mensajes del propio bot o vacíos
    }

    const mensaje = text.message;
    const remitente = phone;

    try {
        await crearTicketGLPI(mensaje, remitente);
        console.log('✅ Ticket creado exitosamente');
        res.send('Ticket creado.');
    } catch (err) {
        console.error('❌ Error al crear ticket en GLPI:', err.message);
        res.status(500).send('Error al crear ticket');
    }
});

// Puerto del servidor
app.listen(3000, () => {
    console.log('🚀 Servidor escuchando en http://localhost:3000');
});

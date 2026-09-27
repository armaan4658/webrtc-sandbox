const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

let worker;
let router;
let producerTransport;
let consumerTransport;
let producer;
let consumer;

// 1. Initialize Mediasoup Worker & Router
const mediaCodecs = [
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: { 'x-google-start-bitrate': 1000 }
  }
];

async function createWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 20000,
    rtcMaxPort: 20100,
  });
  console.log(`Mediasoup Worker created [PID: ${worker.pid}]`);
  router = await worker.createRouter({ mediaCodecs });
}

createWorker();

// 2. Socket.io Signaling Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('getRtpCapabilities', (callback) => {
    callback(router.rtpCapabilities);
  });

  // Create WebRTC Transports
  socket.on('createWebRtcTransport', async ({ sender }, callback) => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '127.0.0.1', announcedIp: null }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    if (sender) producerTransport = transport;
    else consumerTransport = transport;

    callback({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  });

  socket.on('connectTransport', async ({ transportId, dtlsParameters }) => {
    const transport = transportId === producerTransport.id ? producerTransport : consumerTransport;
    await transport.connect({ dtlsParameters });
  });

  // Produce Media (Publish with Simulcast)
  socket.on('produce', async ({ kind, rtpParameters }, callback) => {
    producer = await producerTransport.produce({ kind, rtpParameters });
    console.log('Producer created:', producer.id);
    callback({ id: producer.id });
  });

  // Consume Media (Subscribe)
  socket.on('consume', async ({ rtpCapabilities }, callback) => {
    if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
      return console.error('Cannot consume');
    }

    consumer = await consumerTransport.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false,
    });

    callback({
      id: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    });
  });

  // Request Preferred Simulcast Layer Change
  socket.on('setPreferredLayers', async ({ spatialLayer }) => {
    if (consumer) {
      await consumer.setPreferredLayers({ spatialLayer, temporalLayer: 2 });
      console.log(`Switched Consumer Spatial Layer to: ${spatialLayer}`);
    }
  });
});

server.listen(3000, () => {
  console.log('SFU Server running on http://localhost:3000');
});
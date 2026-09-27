import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';

// Connect to your Express backend running on port 3000
const socket = io('http://localhost:3000');
let device;
let producerTransport;
let consumerTransport;

const encodings = [
  { rid: 'r0', maxBitrate: 100000, scaleResolutionDownBy: 4.0 }, // Low
  { rid: 'r1', maxBitrate: 300000, scaleResolutionDownBy: 2.0 }, // Mid
  { rid: 'r2', maxBitrate: 900000, scaleResolutionDownBy: 1.0 }, // High
];

async function publish() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
  document.getElementById('localVideo').srcObject = stream;
  const track = stream.getVideoTracks()[0];

  socket.emit('getRtpCapabilities', async (routerRtpCapabilities) => {
    device = new Device();
    await device.load({ routerRtpCapabilities });

    socket.emit('createWebRtcTransport', { sender: true }, async (params) => {
      producerTransport = device.createSendTransport(params);

      producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectTransport', { transportId: producerTransport.id, dtlsParameters });
        callback();
      });

      producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        socket.emit('produce', { kind, rtpParameters }, ({ id }) => callback({ id }));
      });

      await producerTransport.produce({ track, encodings, codecOptions: { videoGoogleStartBitrate: 1000 } });
      console.log('Publishing with Simulcast enabled!');
    });
  });
}

async function subscribe() {
  socket.emit('createWebRtcTransport', { sender: false }, async (params) => {
    consumerTransport = device.createRecvTransport(params);

    consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      socket.emit('connectTransport', { transportId: consumerTransport.id, dtlsParameters });
      callback();
    });

    socket.emit('consume', { rtpCapabilities: device.rtpCapabilities }, async (consumerParams) => {
      const consumer = await consumerTransport.consume(consumerParams);
      const { track } = consumer;
      document.getElementById('remoteVideo').srcObject = new MediaStream([track]);
    });
  });
}

window.setLayer = function(spatialLayer) {
  socket.emit('setPreferredLayers', { spatialLayer });
};

// Bind UI buttons safely
document.getElementById('publishBtn').addEventListener('click', publish);
document.getElementById('subscribeBtn').addEventListener('click', subscribe);
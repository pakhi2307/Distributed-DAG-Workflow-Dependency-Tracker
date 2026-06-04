import { Queue, Worker, Job } from 'bullmq';
import axios from 'axios';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// The Queue — producers publish events here
export const glassboardQueue = new Queue('glassboard-events', {
  connection: redisConnection,
});

// The Worker — consumes events in the background
const worker = new Worker(
  'glassboard-events',
  async (job: Job) => {
    if (job.name === 'HANDSHAKE_APPROVED') {
      const { handshakeId, fromModuleTitle, toModuleTitle, projectId, actorName } = job.data;

      const payload = {
        event: 'HANDSHAKE_APPROVED',
        handshakeId,
        message: `✅ Handshake Approved: "${fromModuleTitle}" → "${toModuleTitle}" was accepted by ${actorName}.`,
        projectId,
        timestamp: new Date().toISOString(),
      };

      console.log('\n🔔 [BullMQ Worker] Processing HANDSHAKE_APPROVED event:');
      console.log(JSON.stringify(payload, null, 2));

      // Fire real HTTP POST to the configured webhook URL
      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        try {
          await axios.post(webhookUrl, payload);
          console.log(`✅ [BullMQ Worker] Webhook fired successfully to ${webhookUrl}`);
        } catch (err) {
          console.error('❌ [BullMQ Worker] Webhook delivery failed:', err);
        }
      } else {
        console.log('ℹ️  [BullMQ Worker] No WEBHOOK_URL set. Simulated payload logged above.');
      }
    }

    if (job.name === 'HANDSHAKE_REJECTED') {
      const { fromModuleTitle, toModuleTitle, actorName } = job.data;
      console.log(`\n🔔 [BullMQ Worker] HANDSHAKE_REJECTED: "${fromModuleTitle}" → "${toModuleTitle}" was rejected by ${actorName}.`);
    }
  },
  { connection: redisConnection }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} (${job.name}) completed.`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} (${job?.name}) failed:`, err.message);
});

console.log('🚀 [BullMQ] Queue and Worker initialized.');

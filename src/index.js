// Main Worker entry point
// Exports Durable Objects and handles routing

// Export QuotaManager Durable Object
export { QuotaManager } from './services/quota.ts';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: /process-job - Called by Pages to start video processing
    if (url.pathname === '/process-job' && request.method === 'POST') {
      try {
        const jobData = await request.json();

        // Get a Durable Object stub using the job ID as the unique name
        const id = env.VIDEO_PROCESSOR.idFromName(jobData.jobId);
        const stub = env.VIDEO_PROCESSOR.get(id);

        console.log(`Worker: Spawning Durable Object for job ${jobData.jobId}`);

        // Send job to Durable Object for processing (unlimited CPU time)
        // Fire and forget - don't wait for completion
        ctx.waitUntil(
          stub.fetch('https://internal/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData)
          }).catch(error => {
            console.error(`Durable Object processing error for ${jobData.jobId}:`, error);
          })
        );

        return new Response(JSON.stringify({
          success: true,
          message: 'Job processing started'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Worker error:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Default response
    return new Response('Video Gen Platform Worker - Ready', { status: 200 });
  }
};

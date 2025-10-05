// backend/cron/sla.js
const cron = require('node-cron');
const supabase = require('../supabaseClient');

function start() {
  cron.schedule('* * * * *', async () => {
    try {
      const { data: rows, error } = await supabase.from('tickets').select('id').eq('sla_breached', false).not('sla_due_at', 'is', null).lt('sla_due_at', new Date().toISOString());
      if (error) throw error;
      for (const r of rows) {
        await supabase.from('tickets').update({ sla_breached: true }).eq('id', r.id);
        await supabase.from('ticket_activities').insert({ ticket_id: r.id, action: 'sla_breached', metadata: {} });
        console.log('SLA breached for', r.id);
      }
    } catch (e) {
      console.error('SLA cron error', e);
    }
  });
}

module.exports = { start };

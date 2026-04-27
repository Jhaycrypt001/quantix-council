import { NextResponse } from 'next/server';

// ─── HACKATHON MEMORY TRICK ───
// This forces Next.js to remember the logs across reloads
const globalStore = globalThis as any;
if (!globalStore.logs) {
  globalStore.logs = [
    'INITIALIZING_QUANTIX_KERNEL...',
    'ESTABLISHING_ZERION_HANDSHAKE...',
    'COUNCIL_NODES_ONLINE'
  ];
}

export async function GET() {
  return NextResponse.json(globalStore.logs);
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // Add the newest log to the TOP of the array
    globalStore.logs.unshift(message);
    
    // Keep the array small so the browser doesn't lag during a long demo
    if (globalStore.logs.length > 30) {
      globalStore.logs.pop();
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
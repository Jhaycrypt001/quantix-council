import { NextResponse } from 'next/server';

// ─── HACKATHON MEMORY TRICK ───
// This forces Next.js to remember data across reloads
const globalStore = globalThis as any;
if (!globalStore.proposals) {
  globalStore.proposals = [];
}

export async function GET() {
  return NextResponse.json(globalStore.proposals);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (body.action === 'execute') {
      // The Approver is updating a trade to "EXECUTED"
      const index = globalStore.proposals.findIndex((p: any) => p.id === body.id);
      if (index !== -1) {
        globalStore.proposals[index].status = 'executed';
      }
    } else {
      // The Proposer is adding a brand new trade
      globalStore.proposals.push(body);
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
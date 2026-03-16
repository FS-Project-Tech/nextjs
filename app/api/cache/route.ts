import { NextResponse } from 'next/server';
import { responseCache } from '@/lib/cache';

export async function GET() {
  try {
    const stats = responseCache.getStats();

    const hitRatio =
      typeof stats.hits === 'number' && typeof stats.misses === 'number'
        ? stats.hits + stats.misses > 0
          ? stats.hits / (stats.hits + stats.misses)
          : 0
        : 0;

    return NextResponse.json({
      success: true,
      stats,
      hitRatio,
    });
  } catch (error) {
    console.error('Cache stats error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cache stats',
      },
      { status: 500 }
    );
  }
}
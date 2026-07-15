import type { Metadata } from 'next';

import { PageShell } from '@/components/page-shell';
import { FujiGuide } from '@/features/web3/fuji-guide';

export const metadata: Metadata = {
  title: '플레이 준비 가이드 — Avalanche Quest',
  description: '지갑 연결, Fuji 테스트넷, 게임 조작과 강화 방법을 안내합니다.',
};

export default function GuidePage() {
  return <PageShell eyebrow="BEFORE YOUR FIRST EXPEDITION" title="플레이 가이드" description="지갑과 Fuji 테스트넷 준비부터 전투 조작, 스킬·캐릭터 강화와 보상 수령까지 순서대로 확인하세요."><FujiGuide /></PageShell>;
}

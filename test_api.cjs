// test_api.cjs - Claude API 직접 테스트
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// .env.local 로드
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
const apiKey = match ? match[1].trim() : '';

console.log('API 키 앞 20자:', apiKey.slice(0, 20) + '...');

const client = new Anthropic({ apiKey });

async function test() {
  try {
    console.log('\n[1] 단순 텍스트 테스트...');
    const r1 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: '안녕하세요. 한 문장으로 대답해주세요.' }]
    });
    console.log('✅ 성공! stop_reason:', r1.stop_reason);
    console.log('   응답:', r1.content[0].text);

    console.log('\n[2] System + JSON 응답 테스트...');
    const r2 = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: '당신은 교육 전문가입니다. 반드시 ```json {...} ``` 형식으로만 답변하세요.',
      messages: [{
        role: 'user',
        content: '학생 박민건(88점)의 분석을 JSON으로 해주세요. overallAnalysis 필드만 포함.'
      }]
    });
    console.log('✅ 성공! stop_reason:', r2.stop_reason);
    console.log('   응답 앞 300자:', r2.content[0].text.slice(0, 300));

  } catch (e) {
    console.error('❌ 에러 발생!');
    console.error('  message:', e.message);
    console.error('  status:', e.status);
    console.error('  type:', e.type);
    if (e.error) console.error('  error:', JSON.stringify(e.error));
  }
}

test();

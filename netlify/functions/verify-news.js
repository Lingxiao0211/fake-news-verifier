// netlify/functions/verify-news.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // 处理CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { content, source } = JSON.parse(event.body);
        
        if (!content || !source) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Content and source are required' })
            };
        }

        // 从环境变量获取API密钥
        const API_KEY = process.env.BAIDU_API_KEY;
        const APP_ID = process.env.BAIDU_APP_ID;
        
        if (!API_KEY || !APP_ID) {
            throw new Error('API credentials not configured');
        }

        // 构建SIFT分析提示词 - 英文
        const prompt = `You are a professional fake news verification expert. Please analyze the following information using the SIFT four-step verification method:

Information: "${content}"
Source: "${source}"

Please respond in English with the following structure, providing detailed analysis for each step:

1. [Stop Analysis] Explain why we need to stop and carefully verify this information, pointing out suspicious elements.
2. [Source Investigation] Analyze the credibility of this information source, including publisher background, history, etc.
3. [Coverage Search] Suggest how to find relevant reports from other reliable media, indicate if there is multi-source verification.
4. [Claim Tracing] Analyze how to track original statements and evidence, check if information has been distorted.
5. [Credibility Rating] Provide final credibility rating (Highly Credible/Generally Credible/Needs Caution/Potentially Misleading/Suspected Fake/Confirmed Fake/Unable to Determine)
6. [Final Advice] Provide clear handling recommendations.
7. [Learning Points] Summarize verification techniques learned from this case.

Please respond in JSON format with the following fields:
- sift_analysis: {stop, investigate_source, find_coverage, trace_claims}
- credibility_rating: string
- final_advice: string  
- learning_tips: string`;

        const requestBody = {
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,  // 降低随机性，使回复更一致
            max_tokens: 2000
        };

        console.log('Preparing to call Qianfan API...');
        
        const response = await fetch('https://qianfan.baidubce.com/v2/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'X-Appid': APP_ID
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API response error:', response.status, errorText);
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // 解析AI的回复
        let aiResponse;
        try {
            // 尝试从AI回复中提取JSON
            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResponse = JSON.parse(jsonMatch[0]);
            } else {
                // 如果无法解析为JSON，使用默认回复
                aiResponse = createDefaultResponse(content, source);
            }
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            aiResponse = createDefaultResponse(data.choices[0].message.content, source);
        }

        // 添加原始内容到响应中
        aiResponse.content = content;
        aiResponse.source = source;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(aiResponse)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

// 创建默认响应的备用函数 - 英文
function createDefaultResponse(aiContent, source) {
    return {
        sift_analysis: {
            stop: "Based on AI analysis, this information contains multiple elements that require verification. It is recommended to stop sharing and conduct further verification.",
            investigate_source: `The credibility and background of "${source}" need further investigation.`,
            find_coverage: "It is recommended to search for relevant reports through authoritative news media and official channels for comparative verification.",
            trace_claims: "Need to track the original source of the information and check if it has been modified or distorted."
        },
        credibility_rating: "Needs Caution",
        final_advice: "Do not easily believe or share this information. It is recommended to verify through multiple reliable channels.",
        learning_tips: "When encountering suspicious information, first stop and think, then verify from multiple perspectives."
    };
}
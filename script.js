// 示例数据填充 - 英文
function fillExample(exampleNum) {
    const examples = {
        1: {
            content: "Famous actor Zhang suddenly announced on Weibo that he is permanently retiring from the entertainment industry due to health reasons. Fans expressed shock and sadness. The news quickly topped the hot search list after being posted.",
            source: "Weibo Hot Search"
        },
        2: {
            content: "National Social Security Administration issued an urgent notice: All elderly people over 60 must re-certify their pension qualifications through a mobile app before the end of the month, otherwise pension payments will be suspended.",
            source: "WeChat group circulation"
        },
        3: {
            content: "Latest research from Harvard University found that eating broccoli continuously for 30 days can completely cure early-stage cancer without any other treatment. The research has been nominated for the Nobel Prize in Medicine.",
            source: "Health and Wellness public account"
        }
    };
    
    const example = examples[exampleNum];
    if (example) {
        document.getElementById('suspiciousContent').value = example.content;
        document.getElementById('contentSource').value = example.source;
    }
}

// 主要功能
document.addEventListener('DOMContentLoaded', function() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingElement = document.getElementById('loading');
    const resultSection = document.getElementById('resultSection');
    const verificationResult = document.getElementById('verificationResult');
    
    analyzeBtn.addEventListener('click', async function() {
        const content = document.getElementById('suspiciousContent').value.trim();
        const source = document.getElementById('contentSource').value.trim();
        
        if (!content) {
            alert('Please enter the suspicious information content to analyze');
            return;
        }
        
        if (!source) {
            alert('Please fill in the information source');
            return;
        }
        
        // 显示加载状态
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing...';
        loadingElement.classList.remove('hidden');
        resultSection.classList.add('hidden');
        
        try {
            const analysis = await analyzeWithSIFT(content, source);
            displayVerificationResult(analysis);
            resultSection.classList.remove('hidden');
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Analysis failed, please try again later: ' + error.message);
        } finally {
            // 恢复按钮状态
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = '🔍 Analyze with SIFT Method';
            loadingElement.classList.add('hidden');
        }
    });
});

async function analyzeWithSIFT(content, source) {
    // 这里调用Netlify Function
    const response = await fetch('/.netlify/functions/verify-news', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content: content,
            source: source
        })
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
}

function displayVerificationResult(analysis) {
    const resultElement = document.getElementById('verificationResult');
    
    let html = `
        <div class="content-summary">
            <h4>📝 Content Analyzed:</h4>
            <p><strong>Information:</strong> ${analysis.content}</p>
            <p><strong>Source:</strong> ${analysis.source}</p>
        </div>
        <hr style="margin: 20px 0;">
    `;
    
    // 显示SIFT四个步骤的分析结果
    html += `
        <div class="step-result">
            <div class="step-header">
                <span style="background: #e74c3c; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">1</span>
                <h3>Stop</h3>
            </div>
            <div class="step-content">
                <p>${analysis.sift_analysis.stop}</p>
            </div>
        </div>
        
        <div class="step-result">
            <div class="step-header">
                <span style="background: #f39c12; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">2</span>
                <h3>Investigate the Source</h3>
            </div>
            <div class="step-content">
                <p>${analysis.sift_analysis.investigate_source}</p>
            </div>
        </div>
        
        <div class="step-result">
            <div class="step-header">
                <span style="background: #3498db; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">3</span>
                <h3>Find Better Coverage</h3>
            </div>
            <div class="step-content">
                <p>${analysis.sift_analysis.find_coverage}</p>
            </div>
        </div>
        
        <div class="step-result">
            <div class="step-header">
                <span style="background: #2ecc71; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">4</span>
                <h3>Trace Claims</h3>
            </div>
            <div class="step-content">
                <p>${analysis.sift_analysis.trace_claims}</p>
            </div>
        </div>
        
        <div class="conclusion">
            <h4>🏁 Verification Conclusion</h4>
            <p><strong>Credibility Rating:</strong> 
                <span class="verification-tag ${getTagClass(analysis.credibility_rating)}">
                    ${analysis.credibility_rating}
                </span>
            </p>
            <p><strong>Final Advice:</strong> ${analysis.final_advice}</p>
        </div>
        
        <div class="learning-tips" style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 8px;">
            <h4>💡 Learning Points</h4>
            <p>${analysis.learning_tips}</p>
        </div>
    `;
    
    resultElement.innerHTML = html;
}

function getTagClass(rating) {
    const tagMap = {
        'Highly Credible': 'tag-verified',
        'Generally Credible': 'tag-verified',
        'Needs Caution': 'tag-misleading',
        'Potentially Misleading': 'tag-misleading',
        'Suspected Fake': 'tag-fake',
        'Confirmed Fake': 'tag-fake',
        'Unable to Determine': 'tag-unknown'
    };
    return tagMap[rating] || 'tag-unknown';
}
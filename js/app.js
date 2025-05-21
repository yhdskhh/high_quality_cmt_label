
// 直接从 CDN 导入
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// 配置 Supabase
const SUPABASE_URL = 'https://hcvstlrtepfmbotjjgnu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjdnN0bHJ0ZXBmbWJvdGpqZ251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjQ0MjcsImV4cCI6MjA2MTQwMDQyN30.-iu29KZRAzgg5rSEuZtvBytuUeNeX5qRRHqP4rV2_18';
const ITEMS_PER_PAGE = 10;
// 初始化 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const currentUser = document.getElementById("currentUser").textContent || 'anonymous'; // 如果没有用户名则使用 'anonymous'
const total_num = 10000;
// 全局变量
let currentPage = 1;
let allSamples = [];
let selectedLabels = {};
let totalPages = 1;

// DOM 元素
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    dataTableBody: document.getElementById('dataTableBody'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageInfo: document.getElementById('pageInfo'),
    submitBtn: document.getElementById('submitBtn')
};

// 页面加载初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initApp();
    } catch (error) {
        console.error('初始化失败:', error);
        showError('系统初始化失败，请刷新页面');
    }
});

/**
 * 初始化应用
 */
async function initApp() {
    setupEventListeners();
    await loadData();
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
//    elements.prevBtn.addEventListener('click', goToPreviousPage);
//    elements.nextBtn.addEventListener('click', goToNextPage);
    elements.submitBtn.addEventListener('click', submitLabels);
}

/**
 * 加载数据
 */
async function loadData() {
    showLoading();

    try {
        // 获取数据总数
//        const { count, error1 } = await supabase
//            .from('pairwise_comments')
//            .select('id');
//        if (error1) throw error1;
//        console.error('总数据:', count.length);
//        totalPages = Math.ceil(count.length / ITEMS_PER_PAGE);

        let labeled_num = await getLabeledCount();
        // 计算百分比
        let percentage = Math.ceil((labeled_num / total_num) * 100);
        // 确保百分比在0-100之间
        percentage = Math.max(0, Math.min(100, percentage));
        updateProgressBar(percentage);

        // 获取当前页数据
        const unreviewed_data = await getUnreviewedComments();

        renderTable(unreviewed_data);
//        updatePagination();

    } catch (error) {
        console.error('数据加载失败:', error);
        showError('数据加载失败，请重试');
    } finally {
        hideLoading();
    }
}

/**
 * 渲染表格
 */
function renderTable(samples) {
    let html = '';

    samples.forEach(sample => {
        // 确保SKU是纯数字
        const jdSku = String(sample.sku || '').replace(/\D/g, '');
        const jdLink = jdSku ? `https://item.jd.com/${jdSku}.html` : '#';
        html += `
        <tr>
            <td>${sample.id}</td>
            <td class="product-title"><a href="${jdLink}" target="_blank">${sample.sku_title || '无标题'}</a></td>

            <!-- 评论1列 -->
            <td>
                <div style="color: green;font-weight: bold;" class="comment-content"  >${sample.content1 || '无评论内容'}</div>
                ${renderImages(sample.pics1)}
            </td>

            <!-- 评论2列 -->
            <td>
                <div style="color: blue;font-weight: bold;" class="comment-content" >${sample.content2 || '无评论内容'}</div>
                ${renderImages(sample.pics2)}
            </td>

            <!-- 选择列 -->
            <td>
                <div  class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="sample_${sample.id}" class="radio-input"
                               value="1"
                               ${selectedLabels[sample.id] === '1' ? 'checked' : ''}>
                        <span style="font-size: 12px; font-weight: bold; color: #008000; ">1好</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="sample_${sample.id}" class="radio-input"
                               value="2"
                               ${selectedLabels[sample.id] === '2' ? 'checked' : ''}>
                        <span style="font-size: 12px; font-weight: bold; color: #0000ff;">2好</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="sample_${sample.id}" class="radio-input"
                               value="0"
                               ${selectedLabels[sample.id] === '0' ? 'checked' : ''}>
                        <span style="font-size: 12px; font-weight: bold; color: #777777;">不确定</span>
                    </label>
                </div>
            </td>
        </tr>`;
    });

    elements.dataTableBody.innerHTML = html || `
        <tr>
            <td colspan="5" class="text-center py-4">没有找到数据</td>
        </tr>`;

    // 添加单选按钮事件监听
    document.querySelectorAll('.radio-input').forEach(radio => {
        radio.addEventListener('change', function() {
            const sampleId = this.name.split('_')[1];
            selectedLabels[sampleId] = this.value;
        });
    });
}

/**
 * 渲染图片
 */
function renderImages(images) {
    if (!images || images.length === 0) return '<div class="text-muted">无图片</div>';

    const imageList = Array.isArray(images) ? images : images.split(',');
    return `
    <div class="zoom-container">
        ${imageList.map(img =>
            `<img src="${img.trim()}" class="thumbnail" alt="评论图片" style="cursor: pointer; max-width: 300px;" onclick="window.open(this.src, '_blank')">`
        ).join('')}
    </div>`;
}

// 添加大图预览模态框函数
function showImageModal(imgUrl) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '9999';
    modal.style.cursor = 'pointer';

    const img = document.createElement('img');
    img.src = imgUrl;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';

    modal.appendChild(img);
    document.body.appendChild(modal);

    // 点击关闭
    modal.onclick = () => {
        document.body.removeChild(modal);
    };

    // 键盘ESC关闭
    document.addEventListener('keydown', function escClose(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', escClose);
        }
    });
}
/**
 * 更新分页信息
 */
function updatePagination() {
    elements.pageInfo.textContent = `第${currentPage}页/共${totalPages}页`;
    elements.prevBtn.disabled = currentPage <= 1;
    elements.nextBtn.disabled = currentPage >= totalPages;
}

/**
 * 上一页
 */
function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadData();
    }
}

/**
 * 下一页
 */
function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadData();
    }
}

/**
 * 提交标注结果
 */
async function submitLabels() {
    const samplesToSubmit = Object.keys(selectedLabels).map(id => ({
        sample_id: parseInt(id),
        selected_comment: selectedLabels[id],
        labeled_at: new Date().toISOString(),
        reviewer:currentUser
    }));

    if (samplesToSubmit.length === 0) {
        alert('请至少选择一个评论进行标注');
        return;
    }

    showLoading();
    elements.submitBtn.disabled = true;

    try {
        const { error } = await supabase
            .from('labeled_results')
            .insert(samplesToSubmit);
        if (error) throw error;
        // 提交后清空selectedLabels
        selectedLabels = {}; // 如果selectedLabels是state，使用对应的setState方法
        const labeled_num = await getLabeledCount();
        console.info('已标注数量是：',  labeled_num);
        // 计算百分比
        let percentage = Math.ceil((labeled_num / total_num) * 100);
        // 确保百分比在0-100之间
        percentage = Math.max(0, Math.min(100, percentage));
        updateProgressBar(percentage);
        let data = await getUnreviewedComments();
        renderTable(data);
        alert('提交成功！');

    } catch (error) {
        console.error('提交失败:', error);
        alert('提交失败: ' + error.message);
    } finally {
        hideLoading();
        elements.submitBtn.disabled = false;
    }
}
async function getUnreviewedComments() {

  // 第一步：获取要排除的ID列表
  // const { data: excludeIds } = await supabase
  // .from('labeled_results')
  // .select('sample_id')
  // .eq('reviewer', currentUser);
  // const { data, error } = await supabase
  //   .from('pairwise_comments')
  //   .select(`
  //     id,
  //     sku,
  //     sku_title,
  //     content1,
  //     content2,
  //     pics1,
  //     pics2
  //   `)
  //   .not('id', 'in',`(${excludeIds.map(x => x.sample_id).join(',')})`)
  //   .order('id', {ascending: true})
  //   .limit(10);
  const { data, error } = await supabase
    .rpc('get_unreviewed_comments', { user_id: currentUser });
  if (error) {
    console.error('Error fetching unreviewed comments:', error)
    return null
  }
  return data
}
async function getLabeledCount() {
  const { data, error } = await supabase
    .from('labeled_results')
    .select('sample_id')
    .eq('reviewer', currentUser);

  if (error) {
    console.error('Error fetching labeled count:', error);
    return null;
  }
  return data.length;
}

function updateProgressBar(percentage) {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  progressBar.style.width = percentage + '%';
  progressText.textContent = percentage + '% 已完成';

  // 可根据百分比改变颜色
  if(percentage < 30) {
    progressBar.style.backgroundColor = '#ff9800'; // 橙色
  } else if(percentage < 70) {
    progressBar.style.backgroundColor = '#2196F3'; // 蓝色
  } else {
    progressBar.style.backgroundColor = '#4CAF50'; // 绿色
  }
}
/**
 * 显示加载状态
 */
function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

/**
 * 显示错误信息
 */
function showError(message) {
    elements.dataTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-danger py-4">
                ${message}
                <button onclick="location.reload()" class="btn btn-sm btn-outline-danger ms-2">重试</button>
            </td>
        </tr>`;
}

// Add after other DOM elements
const shareFacebookBtn = document.getElementById('shareFacebook');
const shareTwitterBtn = document.getElementById('shareTwitter');
const sharePinterestBtn = document.getElementById('sharePinterest');
const shareWhatsAppBtn = document.getElementById('shareWhatsApp');

// Add event listeners
shareFacebookBtn.addEventListener('click', () => handleSocialShare('facebook'));
shareTwitterBtn.addEventListener('click', () => handleSocialShare('twitter'));
sharePinterestBtn.addEventListener('click', () => handleSocialShare('pinterest'));
shareWhatsAppBtn.addEventListener('click', () => handleSocialShare('whatsapp'));

function handleSocialShare(platform) {
    const shareUrl = window.location.href;
    const weekRange = document.querySelector('.week-range').textContent;
    const ownerEmail = document.querySelector('.owner-email').textContent;
    const title = `Check out this meal plan for ${weekRange}!`;
    const description = `A meal plan shared by ${ownerEmail} using Nutrition Tracker. Take a look and get inspired!`;
    
    let shareLink = '';
    
    switch (platform) {
        case 'facebook':
            shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            break;
            
        case 'twitter':
            shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
            break;
            
        case 'pinterest':
            shareLink = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(title)}`;
            break;
            
        case 'whatsapp':
            shareLink = `https://wa.me/?text=${encodeURIComponent(title + '\n\n' + shareUrl)}`;
            break;
    }
    
    // Open share dialog in a new window
    const width = 550;
    const height = 450;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
        shareLink,
        'share',
        `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );
} 
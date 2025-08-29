// Minimal DOM test for character counter reset
// This is a simple test that can be run with Jest or similar

document.body.innerHTML = `
  <textarea id="message"></textarea>
  <div id="char-count"></div>
  <form id="post-form"></form>
`;

function setupCharacterCounter() {
  const textarea = document.getElementById('message');
  const counter = document.getElementById('char-count');
  function updateCounter() {
    const length = textarea.value.length;
    counter.textContent = `${length}/280`;
    counter.style.color = length > 280 ? '#ff4b5c' : '#888';
  }
  textarea.addEventListener('input', updateCounter);
  updateCounter();
}
setupCharacterCounter();

// Simulate typing
const textarea = document.getElementById('message');
textarea.value = 'Hello world!';
textarea.dispatchEvent(new Event('input'));
console.assert(document.getElementById('char-count').textContent === '12/280', 'Counter should show 12/280');

// Simulate successful post (clear textarea)
textarea.value = '';
textarea.dispatchEvent(new Event('input'));
console.assert(document.getElementById('char-count').textContent === '0/280', 'Counter should reset to 0/280');

console.log('Character counter reset test passed!');

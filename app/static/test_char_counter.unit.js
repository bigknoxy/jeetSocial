// Jest unit tests for character counter and error logic

document.body.innerHTML = `
  <textarea id="message"></textarea>
  <div id="char-count"></div>
  <button id="post-btn"></button>
  <div id="error"></div>
`;

function setupCharacterCounter() {
  const textarea = document.getElementById('message');
  const counter = document.getElementById('char-count');
  const postBtn = document.getElementById('post-btn');
  const errorDiv = document.getElementById('error');

  function updateCounter() {
    const length = textarea.value.length;
    counter.textContent = `${length}/280`;
    if (length > 280) {
      counter.style.color = '#ff4b5c';
      postBtn.disabled = true;
      errorDiv.textContent = "Your message is a bit too long. Let's keep it kind and concise!";
    } else if (length >= 240) {
      counter.style.color = '#ffb26b';
      postBtn.disabled = false;
      errorDiv.textContent = '';
    } else if (length === 0) {
      counter.style.color = '#888';
      postBtn.disabled = true;
      errorDiv.textContent = "Share something uplifting to brighten someone's day!";
    } else {
      counter.style.color = '#888';
      postBtn.disabled = false;
      errorDiv.textContent = '';
    }
  }
  textarea.addEventListener('input', updateCounter);
  updateCounter();
}

setupCharacterCounter();

test('counter updates and disables button for over-limit', () => {
  const textarea = document.getElementById('message');
  const postBtn = document.getElementById('post-btn');
  const errorDiv = document.getElementById('error');
  textarea.value = 'a'.repeat(281);
  textarea.dispatchEvent(new Event('input'));
  expect(document.getElementById('char-count').textContent).toBe('281/280');
  expect(postBtn.disabled).toBe(true);
  expect(errorDiv.textContent).toMatch(/too long/);
});

test('counter shows warning color for near-limit', () => {
  const textarea = document.getElementById('message');
  const postBtn = document.getElementById('post-btn');
  textarea.value = 'a'.repeat(245);
  textarea.dispatchEvent(new Event('input'));
  expect(document.getElementById('char-count').style.color).toBe('#ffb26b');
  expect(postBtn.disabled).toBe(false);
});

test('counter disables button and shows error for empty', () => {
  const textarea = document.getElementById('message');
  const postBtn = document.getElementById('post-btn');
  const errorDiv = document.getElementById('error');
  textarea.value = '';
  textarea.dispatchEvent(new Event('input'));
  expect(document.getElementById('char-count').textContent).toBe('0/280');
  expect(postBtn.disabled).toBe(true);
  expect(errorDiv.textContent).toMatch(/uplifting/);
});

test('counter enables button for valid input', () => {
  const textarea = document.getElementById('message');
  const postBtn = document.getElementById('post-btn');
  textarea.value = 'Hello world!';
  textarea.dispatchEvent(new Event('input'));
  expect(document.getElementById('char-count').textContent).toBe('12/280');
  expect(postBtn.disabled).toBe(false);
});

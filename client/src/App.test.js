// client/src/App.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('renders chat application', () => {
  render(<App />);
  
  // Check if the chat input, send button, and messages container are rendered
  const chatInput = screen.getByRole('textbox');
  const sendButton = screen.getByRole('button', { name: /send/i });
  const messagesContainer = screen.getByRole('list');

  expect(chatInput).toBeInTheDocument();
  expect(sendButton).toBeInTheDocument();
  expect(messagesContainer).toBeInTheDocument();
});

test('sends and receives messages', () => {
  render(<App />);
  
  // Dummy user messages
  const userMessages = ['Hello', 'How are you?', 'Goodbye'];

  // Send messages
  const chatInput = screen.getByRole('textbox');
  const sendButton = screen.getByRole('button', { name: /send/i });

  userMessages.forEach((message) => {
    fireEvent.change(chatInput, { target: { value: message } });
    fireEvent.click(sendButton);
  });

  // Check if messages are displayed
  userMessages.forEach((message) => {
    const messageElement = screen.getByText(message);
    expect(messageElement).toBeInTheDocument();
  });
});

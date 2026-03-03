import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from port 3000');
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Test server running on port 3000');
});

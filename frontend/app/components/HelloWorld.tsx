type HelloWorldProps = {
  displayName: string;
};

// LIFF から取得した表示名を受け取り、Hello World を表示するだけの純粋な表示部品
export default function HelloWorld({ displayName }: HelloWorldProps) {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Hello World</h1>
      <p>
        こんにちは、<strong>{displayName}</strong> さん
      </p>
    </main>
  );
}

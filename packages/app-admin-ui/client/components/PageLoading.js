import { LoadingIndicator } from '@arch-ui/loading';

export default function PageLoading() {
  return (
    <div
      css={{
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <LoadingIndicator size={12} />
    </div>
  );
}

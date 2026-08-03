export default function StorageBanner({ loadStatus, saveBlocked }) {
  let message = null;

  if (loadStatus === 'blocked') {
    message = {
      tone: 'warn',
      text: 'Storage is blocked (private mode?). You can still use the app, but changes won’t be saved.',
    };
  } else if (saveBlocked) {
    message = {
      tone: 'warn',
      text: 'Couldn’t save your latest change — storage may be full or blocked.',
    };
  } else if (loadStatus === 'corrupt') {
    message = {
      tone: 'error',
      text: 'Saved data was unreadable and couldn’t be restored. Starting with an empty vault.',
    };
  } else if (loadStatus === 'recovered') {
    message = {
      tone: 'info',
      text: 'Some saved entries were invalid and were skipped. The rest were restored.',
    };
  }

  if (!message) return null;

  return (
    <div className={`banner banner-${message.tone}`} role="status" aria-live="polite">
      {message.text}
    </div>
  );
}

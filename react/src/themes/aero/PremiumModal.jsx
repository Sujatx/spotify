export default function PremiumModal({ show, onClose, onConfirm }){
  return (
    <div
      className={`modal-backdrop ${show ? 'show' : ''}`}
      onClick={e => { if(e.target === e.currentTarget) onClose(); }}
    >
      <div className="aero-modal">
        <h3>Upgrade to Premium</h3>
        <p>Unlimited skips, no ads between tracks, and offline mode for when the dial-up drops (again). $9.99/mo, cancel via a 40-minute phone call.</p>
        <div className="row">
          <button className="link-x" onClick={onClose}>maybe later</button>
          <button className="btn-upgrade-v2" onClick={onConfirm}>Upgrade →</button>
        </div>
      </div>
    </div>
  );
}

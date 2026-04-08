/**
 * sip_service.ts — Native React Native integration for SIP.js
 * 
 * Sets up the UserAgent to register with the SIP server and uses
 * react-native-webrtc for audio transport.
 */
import { UserAgent, UserAgentOptions, Inviter, Invitation, SessionState } from 'sip.js';
import { RTCPeerConnection, mediaDevices, MediaStream } from 'react-native-webrtc';
import { SIPCredentialsManager } from './sip_credentials';

export type SIPState = 'unregistered' | 'registering' | 'registered' | 'error';
type StateListener = (s: SIPState) => void;

class SIPService {
  private ua: UserAgent | null = null;
  private _state: SIPState = 'unregistered';
  private listeners: StateListener[] = [];
  private incomingCallListeners: (() => void)[] = [];
  
  // Current active session
  public activeSession: Invitation | Inviter | null = null;
  public remoteStream: MediaStream | null = null;

  get state(): SIPState {
    return this._state;
  }

  onStateChange(fn: StateListener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  onIncomingCall(fn: () => void): () => void {
    this.incomingCallListeners.push(fn);
    return () => {
      this.incomingCallListeners = this.incomingCallListeners.filter((l) => l !== fn);
    };
  }

  private setState(s: SIPState) {
    this._state = s;
    this.listeners.forEach((fn) => fn(s));
  }

  async connect(): Promise<void> {
    const creds = await SIPCredentialsManager.get();
    if (!creds.enabled || !creds.uri || !creds.registrar) {
      console.log('SIP Service is disabled or missing credentials.');
      return;
    }

    this.setState('registering');

    try {
      const uriParts = creds.uri.replace('sip:', '').split('@');
      const user = uriParts[0];
      const domain = uriParts[1];

      const uaOptions: UserAgentOptions = {
        uri: UserAgent.makeURI(creds.uri),
        transportOptions: {
          server: creds.registrar,
        },
        authorizationUsername: user,
        authorizationPassword: creds.password,
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionOptions: {
            rtcConfiguration: {
              iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            }
          }
        },
        delegate: {
          onInvite: (invitation: Invitation) => {
            console.log('Incoming SIP call received');
            this.handleIncomingCall(invitation);
          }
        }
      };

      this.ua = new UserAgent(uaOptions);

      await this.ua.start();
      
      // We must register explicitly
      // Note: sip.js v0.21 uses Registerer
      const { Registerer } = await import('sip.js');
      const registerer = new Registerer(this.ua);
      
      registerer.stateChange.addListener((newState) => {
        if (newState === 'Registered') {
          this.setState('registered');
        } else if (newState === 'Unregistered') {
          this.setState('unregistered');
        }
      });
      
      await registerer.register();

    } catch (e: any) {
      console.error('SIP connect failed', e);
      this.setState('error');
    }
  }

  async disconnect(): Promise<void> {
    if (this.ua) {
      await this.ua.stop();
      this.ua = null;
    }
    this.setState('unregistered');
  }

  private handleIncomingCall(invitation: Invitation) {
    this.activeSession = invitation;
    
    // Notify the call handler to wake up
    this.incomingCallListeners.forEach(fn => fn());
    
    invitation.stateChange.addListener((newState: SessionState) => {
      console.log(`SIP Session State: ${newState}`);
    });
  }

  async answerCall(): Promise<void> {
    if (!this.activeSession || !(this.activeSession instanceof Invitation)) {
      throw new Error("No incoming call to answer");
    }

    try {
      await this.activeSession.accept({
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true, video: false }
        }
      });
    } catch (e) {
      console.error('Failed to answer SIP call', e);
    }
  }

  async hangup(): Promise<void> {
    if (!this.activeSession) return;

    try {
        if (this.activeSession.state === SessionState.Established) {
          await this.activeSession.bye();
        } else if (this.activeSession instanceof Invitation) {
          await this.activeSession.reject();
        }
    } catch (e) {
        console.error('Hangup failed', e);
    } finally {
        this.activeSession = null;
        this.remoteStream = null;
    }
  }
}

export const sipService = new SIPService();

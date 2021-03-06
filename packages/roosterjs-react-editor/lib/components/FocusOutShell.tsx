// Note: keep the dependencies for this generic component at a minimal (e.g. don't import OfficeFabric)
import * as React from "react";
import { Browser } from "roosterjs-editor-dom";
import { closest, css, NullFunction } from "roosterjs-react-common";

export type FocusEventHandler = (ev: React.FocusEvent<HTMLElement>) => void;

export interface FocusOutShellProps {
    allowMouseDown?: (target: HTMLElement) => boolean;
    className?: string;
    onBlur?: FocusEventHandler;
    onFocus?: FocusEventHandler;
    children: (calloutClassName: string, calloutOnDismiss: FocusEventHandler) => React.ReactNode;
    shouldCallBlur?: (nextTarget: HTMLElement, shouldCallBlurDefault: (nextTarget: HTMLElement) => boolean) => boolean;
}

export interface FocusOutShellState {
    isFocused?: boolean;
}

export default class FocusOutShell extends React.PureComponent<FocusOutShellProps, FocusOutShellState> {
    private static readonly BaseClassName = "focus-out-shell";
    private static readonly CalloutClassName = `${FocusOutShell.BaseClassName}-callout`;
    private static NextId = 0;

    private _calloutClassName = `${FocusOutShell.CalloutClassName}-${FocusOutShell.NextId++}`;
    private _containerDiv: HTMLDivElement;

    constructor(props: FocusOutShellProps) {
        super(props);

        this.state = { isFocused: false };
    }

    public render(): JSX.Element {
        const { className, children } = this.props;
        return (
            <div
                className={css(FocusOutShell.BaseClassName, className, { "is-focused": this.state.isFocused })}
                ref={this._containerDivOnRef}
                onBlur={this._onBlur}
                onFocus={this._onFocus}
                onMouseDown={this._onMouseDown}
            >
                {children(this._calloutClassName, this._calloutOnDismiss)}
            </div>
        );
    }

    private _calloutOnDismiss = (ev: React.FocusEvent<HTMLElement>): void => {
        // command bar can trigger dismiss event w/o an event object for submenu (when
        // button is clicked again to hide submenu)
        if (!ev) {
            return;
        }

        // For Callout component, target is the event object from the document.body focus event
        const nextTarget = ev.target as HTMLElement;

        if (this._shouldCallBlur(nextTarget)) {
            // delay so callout dismiss can complete
            requestAnimationFrame(() => {
                const { onBlur = NullFunction } = this.props;

                onBlur(ev);
                this.setState({ isFocused: false });
            });
        }
    };

    private _onBlur = (ev: React.FocusEvent<HTMLElement>): void => {
        // relatedTarget is the event object from the blur event, so it is the next focused element
        const nextTarget = ev.relatedTarget as HTMLElement;

        if (this._shouldCallBlur(nextTarget)) {
            const { onBlur = NullFunction } = this.props;

            onBlur(ev);
            this.setState({ isFocused: false });
        }
    };

    private _shouldCallBlur(nextTarget: HTMLElement): boolean {
        const { shouldCallBlur = this._shouldCallBlurDefault } = this.props;
        return shouldCallBlur(nextTarget, this._shouldCallBlurDefault);
    }

    private _shouldCallBlurDefault = (nextTarget: HTMLElement): boolean => {
        // don't call blur if the next target is an element on this container
        if (nextTarget && this._containerDiv.contains(nextTarget)) {
            return false;
        }

        // similarly, don't call blur if the next target is the callout or its children
        if (nextTarget == null && Browser.isIE) {
            nextTarget = document.activeElement as HTMLElement;
        }
        if (nextTarget && closest(nextTarget, `.${this._calloutClassName}`)) {
            return false;
        }

        return true;
    };

    private _onFocus = (ev: React.FocusEvent<HTMLElement>): void => {
        if (!this.state.isFocused) {
            const { onFocus = NullFunction } = this.props;
            onFocus(ev);
        }
    };

    // React onFocus isn't reliable, hook into native version instead
    private _onFocusNative = (ev: FocusEvent): void => {
        this.setState({ isFocused: true });
    };

    private _onMouseDown = (ev: React.MouseEvent<HTMLElement>): void => {
        const { allowMouseDown = NullFunction } = this.props;
        const { target } = ev;

        if (allowMouseDown(target as HTMLElement)) {
            return;
        }

        ev.preventDefault(); // prevents blur event from triggering
    };

    private _containerDivOnRef = (ref: HTMLDivElement): void => {
        this._containerDiv = ref;
        const eventName = "focusin";
        if (this._containerDiv) {
            this._containerDiv.removeEventListener(eventName, this._onFocusNative);
        }
        if (ref) {
            ref.addEventListener(eventName, this._onFocusNative);
        }
    };
}

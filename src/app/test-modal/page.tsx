"use client";
import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export default function TestPage() {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ padding: 50 }}>
            <h1>Radix Dialog Test</h1>
            <button onClick={() => setOpen(true)} style={{ padding: "10px 20px", cursor: "pointer" }}>
                Open Test Modal
            </button>

            <Dialog.Root open={open} onOpenChange={setOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999 }} />
                    <Dialog.Content style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "white",
                        padding: 30,
                        borderRadius: 8,
                        zIndex: 10000,
                        width: "300px"
                    }}>
                        <Dialog.Title>Test Modal</Dialog.Title>
                        <Dialog.Description>If you can see this, Radix Dialog is working.</Dialog.Description>

                        <div style={{ marginTop: 20 }}>
                            <button
                                onClick={() => setOpen(false)}
                                style={{ cursor: "pointer", padding: "8px 16px" }}
                            >
                                Close
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}

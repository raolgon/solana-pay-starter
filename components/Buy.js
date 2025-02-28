import React, { useState, useEffect,useMemo } from "react";
import { Keypair, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { InfinitySpin } from "react-loader-spinner";
import IPFSDownload from "./IpfsDownload";
import { findReference, FindReferenceError } from "@solana/pay";
import { addOrder, hasPurchased, fetchItem } from "../lib/api";

const STATUS = {
    Initial: "Initial",
    Submmited: "Submmited",
    Paid: "Paid",
};

export default function Buy({ itemID }) {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const orderID = useMemo(() => Keypair.generate().publicKey, []);

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(STATUS.Initial);

    const order = useMemo(
        () => ({
            buyer: publicKey.toString(),
            orderID: orderID.toString(),
            itemID: itemID,
        }),
        [publicKey, orderID, itemID]
    );

    const processTransaction = async () => {
        setLoading(true);
        const txResponse = await fetch("../api/createTransaction", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(order),
        });

        const txData = await txResponse.json();

        const tx = Transaction.from(Buffer.from(txData.transaction, "base64"));
        console.log("Tx data is", tx);

        try {
            const txHash = await sendTransaction(tx, connection);
            console.log(`Transaction sent: https://solscan.io/tx/${txHash}?cluster=devnet`);
            setStatus(STATUS.Submmited);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        async function checkPurchased(){
            const purchased = await hasPurchased(publicKey, itemID);
            if(purchased){
                setStatus(STATUS.Paid);
                const item = await fetchItem(itemID);
                console.log("Address has purchased this item!");
            }
        }
        checkPurchased();
    }, [publicKey, itemID]);

    useEffect(() => {

        if(status === STATUS.Submmited) {
            setLoading(true);
            const interval = setInterval(async () => {
                try {
                    const result = await findReference(connection, orderID);
                    console.log("Finding tx reference", result.confirmationStatus);

                    if(
                        result.confirmationStatus === "confirmed" ||
                        result.confirmationStatus === "finalized"
                    ) {
                        clearInterval(interval);
                        setStatus(STATUS.Paid);
                        setLoading(false);
                        addOrder(order);
                        alert("Thank you for your purchase!");
                    }
                } catch (e) {
                    if(e instanceof FindReferenceError){
                        return null;
                    }
                    console.error("Unknown error" ,e);
                } finally {
                    setLoading(false);
                }
            }, 1000);
            return () => {
                clearInterval(interval)
            };
        }

        async function getItem(itemID){
            const item = await fetchItem(itemID);
            setItem(item);
        }
    }, [status]);

    if(!publicKey){
        return (
            <div>
                <p>You need to connect your wallet to make transactions</p>
            </div>
        );
    }

    if(loading){
        return (
            <div>
                <InfinitySpin color="gray"/>
            </div>
        );
    }

    return (
        <div>
            {status === STATUS.Paid ? (
                <IPFSDownload
                    filename="emojis.zip"
                    hash="QmWWH69mTL66r3H8P4wUn24t1L5pvdTJGUTKBqT11KCHS5"
                    cta="Download emojis"
                />
            ) : (
                <button
                    disabled={loading}
                    className="buy-button"
                    onClick={processTransaction}
                >
                    Buy now 🠚
                </button>
            )}
        </div>
    );
}
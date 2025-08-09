import { Detail, Cache, showToast, Toast, Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { exec } from "child_process";

const cache = new Cache();

interface initFormValues {
    tsharkPath: string;
}

function Init() {
    const { push } = useNavigation();

     const { handleSubmit, itemProps } = useForm<initFormValues>({
        validation: {
            tsharkPath: FormValidation.Required,
        },
        onSubmit: (values) => {
            cache.set("tsharkPath", values.tsharkPath);
            showToast({
                style: Toast.Style.Success,
                title: "Tshark Path Set",
                message: `Tshark path set to: ${values.tsharkPath}`,
            });
            push(<Home />);
        },
    });

    return (
        <Form
                searchBarAccessory={
                    <Form.LinkAccessory
                        target="https://tshark.dev/setup/install/#install-wireshark-with-a-package-manager"
                        text="Tshark Installation Guide"
                    />
            }
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Set Tshark Path" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.Description
                title="Rayshark Setup"
                text="Rayshark requires Tshark to be installed on your system. If already installed, you can set the path below."
            />
            <Form.TextField
                title="Tshark Path"
                placeholder="Path to the tshark executable"
                {...itemProps.tsharkPath}
                info="You can find the path to tshark by running 'which tshark' in your terminal."
            />
        </Form>
    );
}

function Home() {
    const [output, setOutput] = useState("");
    const [tsharkPath, setTsharkPath] = useState("");

    const checkTshark = async () => {
        setTsharkPath(cache.get("tsharkPath") || "");
        const toast = await showToast({
            title: "Checking tshark...",
            message: "Please wait.",
            style: Toast.Style.Animated,
        });

        exec(`${tsharkPath} -v`, async (error, stdout, stderr) => {
            if (stdout) {
                setOutput(stdout);
                toast.style = Toast.Style.Success;
                toast.title = "Tshark Found";
                toast.message = "Tshark is installed and working";
            } else {
                const errorMessage = error ? error.message : stderr;
                setOutput(errorMessage);
                toast.style = Toast.Style.Failure;
                toast.title = "Error";
                toast.message = `Error: ${errorMessage}`;
            }
        });
    };

    checkTshark();
    return <Detail markdown={`# Rayshark (tshark for raycast)\n\n## Output:\n${output}`} />;
}

export default function Command() {
    if (cache.has("tsharkPath")) {
        return <Home />;
    } else {
        return <Init />;
    }
}
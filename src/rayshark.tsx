import { Detail, Cache, showToast, Toast, Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState, useEffect } from "react";
import { exec } from "child_process";
import { read, readFile } from "fs";

const cache = new Cache();

type initFormValues = {
    tsharkPath: string;
}

function Init() {
    const { push } = useNavigation();

     const { handleSubmit, itemProps } = useForm<initFormValues>({
        validation: {
            tsharkPath: FormValidation.Required,
        },
        onSubmit: async(values) => {
            cache.set("tsharkPath", values.tsharkPath);
            push(<Index />);
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

type Option = {
    value: string;
    icon: Icon;
}

const mainOptions: Record<string, Option> = {
    "Capture Interface": { value: "-i", icon: Icon.Network },
    "Read file": { value: "-r", icon: Icon.Receipt },
};

const recordOptions: Record<string, Option> = {
    "Capture Filter": { value: "-f", icon: Icon.Filter },
    "Write to file": { value: "-w", icon: Icon.SaveDocument },
    "Capture Count": { value: "-c", icon: Icon.ReplaceOne },
};

const captureFilterOptions = {
    "HTTP": { value: "http", icon: Icon.Circle },
    "DNS": { value: "dns", icon: Icon.Circle },
    "TCP": { value: "tcp", icon: Icon.Circle },
    "Traffic to/from port": { value: "host", icon: Icon.Repeat },
};

const readOptions: Record<string, Option> = {
    "Two Pass": { value: "-2", icon: Icon.Repeat },
    "Display Filter": { value: "-Y", icon: Icon.Filter },
    "Display as fields": { value: "-T fields", icon: Icon.CheckList },
    "Display as JSON": { value: "-T json", icon: Icon.ShortParagraph },
};

function Index() {
    const { push } = useNavigation();

    const [mode, setMode] = useState<string>("");
    const [options, setOptions] = useState<string[]>([]);
    const [output, setOutput] = useState<string>("");
    const [file, setFile] = useState<string[]>([]);
    const [captureFilterHost, setCaptureFilterHost] = useState<string>("");

    const [optionAndValues, setOptionAndValues] = useState<Record<string, string[]>>({});

    useEffect(() => {
        setOptionAndValues(
            Object.fromEntries(
                Object.values(mode === "-r" ? readOptions : recordOptions)
                    .filter((item) => options.includes(item.value))
                    .map((item) => [item.value, []])
            )
        );
    }, [options, mode]);

    const [command, setCommand] = useState<string>("");

    useEffect(() => {
        const mainOption = mode === "-i" ? mode : `${mode} ${file.join()}`;
        var subOptions = "";
        for (const [key, value] of Object.entries(optionAndValues)) {
            if (value.length === 0) {
                subOptions += key;
            } else {
                if (key === "-f") {
                    subOptions += `${key} "${value.filter((item) => item !== "host").join(" ")} ${value.filter((item) => item === "host").join()} ${captureFilterHost}"`;
                } else {
                    subOptions += `${key} ${value.join(" ")}`;
                }
            }
        }
        setCommand(`${mainOption} ${subOptions}`);
    }, [mode, file, optionAndValues, captureFilterHost]);

    const modeItems = Object.entries(mainOptions).map(([key, item]) => (
        <Form.Dropdown.Item key={key} value={item.value} title={key} icon={item.icon} />
    ));

    const optionItems = Object.entries(mode === "-r" ? readOptions : recordOptions).map(([key, item]) => (
        <Form.TagPicker.Item key={key} value={item.value} title={key} icon={item.icon} />
    ));

    const captureFilterItems = Object.entries(captureFilterOptions).map(([key, item]) => (
        <Form.TagPicker.Item key={key} value={item.value} title={key} icon={item.icon} />
    ));

    useEffect(() => {
        const checkTshark = async () => {
            const cachedPath = cache.get("tsharkPath") || "tshark";
            
            const toast = await showToast({
                title: "Checking tshark...",
                message: "Please wait.",
                style: Toast.Style.Animated,
            });

            exec(`${cachedPath} -v`, async (error, stdout, stderr) => {
                if (stdout) {
                    setOutput(stdout);
                    toast.style = Toast.Style.Success;
                    toast.title = "Tshark is installed and working";
                    toast.message = stdout.split("\n")[0];
                } else {
                    const errorMessage = error ? error.message : stderr;
                    setOutput(errorMessage);
                    toast.style = Toast.Style.Failure;
                    toast.title = "Error, you may need to reset the path";
                    toast.message = errorMessage;
                    toast.primaryAction = {
                        title: "Set Path",
                        onAction: () => {
                            push(<Init />);
                        }
                    };
                }
            });
        };

        checkTshark();
    }, []);

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action title="Run Command" onAction={() => {
                        push(<Output options={command} />);
                    }} />
                </ActionPanel>
            }
        >
            <Form.Description
                title="Rayshark"
                text="Run command"
            />

            <Form.Dropdown
                id="dropdown"
                title="Mode"
                value={mode}
                onChange={(newMode) => {
                    setMode(newMode);
                    setOptions([]); // Clear options when mode changes
                    setFile([]);
                }}
            >
                {modeItems}
            </Form.Dropdown>

            {mode === "-r" && (
                <Form.FilePicker
                    id="file-picker"
                    title="Capture file"
                    value={file}
                    onChange={setFile}
                    allowMultipleSelection={false}
                />
            )}

            <Form.TagPicker
                id="tag-picker"
                title="Options"
                value={options}
                onChange={setOptions}
            >
                {optionItems}
            </Form.TagPicker>

            {mode === "-i" && options.includes("-w") && (
                <Form.FilePicker
                    id="file-picker"
                    title="Save Capture Location"
                    value={optionAndValues["-w"]}
                    onChange={(newValue) => setOptionAndValues((prev) => ({ ...prev, ["-w"]: newValue }))}
                    allowMultipleSelection={false}
                    canChooseDirectories
                    canChooseFiles={false}
                />
            )}

            {mode === "-i" && options.includes("-f") && (
                    <Form.TagPicker
                        id="capture-filter-picker"
                        title="Capture Filter Type"
                        value={optionAndValues["-f"]}
                        onChange={(newValue) => setOptionAndValues((prev) => ({ ...prev, ["-f"]: newValue }))}
                    >
                        {captureFilterItems}
                    </Form.TagPicker>
            )}

            {mode === "-i" && optionAndValues["-f"] && optionAndValues["-f"].includes("host") && (
                <Form.TextField
                    id="capture-filter-value"
                    title="Capture Filter Value"
                    placeholder="Enter custom filter or value"
                    value={captureFilterHost}
                    onChange={setCaptureFilterHost}
                />
            )}

            <Form.Description
                title="Command"
                text={`tshark ${command}`}
            />

            <Form.Description
                title="Bugfixing"
                text={`${Object.entries(optionAndValues)}`}
            />
        </Form>
    );
}

function Output(options: string) {
    const [output, setOutput] = useState<string | null>(null);

    useEffect(() => {
        const runCommand = async (options: string) => {
            const cachedPath = cache.get("tsharkPath") || "tshark";
            const command = `${cachedPath} ${options}`;

            const toast = await showToast({
                title: "Running Command...",
                message: command,
                style: Toast.Style.Animated,
            });

            exec(`${cachedPath} ${command}`, (error, stdout, stderr) => {
                if (stdout) {
                    setOutput(stdout);
                    toast.style = Toast.Style.Success;
                    toast.title = "Command Completed";
                    toast.message = stdout;
                } else {
                    const errorMessage = error ? error.message : stderr;
                    setOutput(errorMessage);
                    toast.style = Toast.Style.Failure;
                    toast.title = "Error";
                    toast.message = errorMessage;
                }
            });
        };

        runCommand(options);
    }, []);

    return(
        <Detail
            markdown={output}
        />
    );
}

export default function Command() {
    if (cache.has("tsharkPath")) {
        return <Index />;
    } else {
        return <Init />;
    }
}
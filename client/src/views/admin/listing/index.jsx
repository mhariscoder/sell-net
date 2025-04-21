import React, { useEffect, useState } from "react";
import {
  Box,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  FormErrorMessage,
  Flex,
} from "@chakra-ui/react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import Table from "../../../components/table/Table";
import { findAll, create, update, remove, generateToken } from "services/listing";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { MdOutlinePerson } from "react-icons/md";

const validationSchema = Yup.object().shape({
 
});

export default function Listing() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formValues, setFormValues] = useState({
   
  });
  const listings = useSelector((state) => state.listing.data);

  const onOpen = () => setIsOpen(true);
  const onClose = () => {
    setIsOpen(false);
    setSelectedId(null);
    setFormValues({
      
    });
  };
  const onConfirmOpen = () => setIsConfirmOpen(true);
  const onConfirmClose = () => setIsConfirmOpen(false);

  const handleSubmit = async (values, { resetForm }) => {
    if (selectedId) {
      await update(selectedId, values);
    } else {
      await create(values);
    }

    resetForm();
    onClose();
    findAll();
  };

  const handleUpdateClick = (data) => {
    // When updating, set the form values to the existing marketplace data
    setFormValues({
      
    });
    setSelectedId(data._id);
    onOpen();
  };

  const handleRemoveClick = (data) => {
    setSelectedId(data._id);
    onConfirmOpen();
  };

  const handleRemove = async () => {
    if (selectedId) {
      await remove(selectedId);
      onConfirmClose();
      findAll();
    }
  };

  useEffect(() => {
    findAll();
  }, []);

  useEffect(() => {
    console.log('listings', listings)
  }, [listings]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <SimpleGrid mb="20px" columns={{ sm: 1, md: 1 }} spacing={{ base: "20px", xl: "20px" }}>
        <Table
          columnsData={t("listing:columnsData", { returnObjects: true })}
          tableData={listings}
          headingData={"Listing"}
          onUpdate={handleUpdateClick}
          onDelete={handleRemoveClick}
          menusData={[{ title: "Create", icon: MdOutlinePerson, action: onOpen }]}
        />
      </SimpleGrid>


      <Modal isOpen={isConfirmOpen} onClose={onConfirmClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t("global:confirmDeletion")}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>{t("global:confirmDeletionMessage")}</ModalBody>
          <ModalFooter>
            <Button colorScheme="red" onClick={handleRemove}>
              {t("global:yes")}
            </Button>
            <Button variant="ghost" onClick={onConfirmClose}>
              {t("global:no")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
